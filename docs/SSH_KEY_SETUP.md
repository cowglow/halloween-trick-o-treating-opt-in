# Generating SSH keys (macOS & Windows)

A general reference for creating SSH key pairs on either platform — covers both
kinds you'll run into:

- **Passphrase-free** — for automation that has to authenticate non-interactively
  (nothing is around to type a passphrase). This repo already uses one:
  `id_hetzner`, generated in [`HETZNER_DEPLOY.md`](./HETZNER_DEPLOY.md) step 0 for
  GitHub Actions to deploy with.
- **Passphrase-protected** — for your own personal use (your GitHub account, your own
  login to a server) — the passphrase protects the private key at rest if your laptop
  is ever lost or compromised. Pair it with an agent (below) so you're not retyping
  the passphrase on every single connection. This repo's is `id_hetzner_admin`, also
  generated per `HETZNER_DEPLOY.md` step 0.

Don't reuse a passphrase-free key for personal logins, and don't try to give an
automation key a passphrase — CI/scripts have no TTY to answer the prompt with.

Both of this repo's keys live in `cert/` at the repo root (gitignored — see
`.gitignore`), not the `~/.ssh/id_example` paths used generically below. That's a
deliberate choice: keeping the deploy key in the repo checkout (rather than scattered
across whichever machine happened to generate it) is what lets
[`HETZNER_REBUILD.md`](./HETZNER_REBUILD.md) reuse the same keypair after a server
teardown instead of rotating a new one and re-syncing secrets. Swap `~/.ssh/id_example`
for `cert/id_hetzner` (or `cert/id_hetzner_admin`) wherever it appears below.

## Prerequisites

OpenSSH ships with macOS Terminal by default. On Windows 11, PowerShell has it too;
if `ssh-keygen` isn't found, add it once via an admin PowerShell:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

(or **Settings → Optional Features → Add a feature → OpenSSH Client**).

## Generating a passphrase-free key

Pick a descriptive filename instead of overwriting the default `id_ed25519` —
especially if you'll end up with more than one key (this repo's convention is
`id_<purpose>`, e.g. `id_hetzner`).

**macOS** — Terminal:

```bash
ssh-keygen -t ed25519 -C "your-label-here" -f ~/.ssh/id_example -N ""
```

**Windows 11** — PowerShell:

```powershell
ssh-keygen -t ed25519 -C "your-label-here" -f $HOME\.ssh\id_example -N '""'
```

If the empty-passphrase quoting misbehaves in your shell, omit `-N` entirely and
press Enter twice at the passphrase prompts instead — same result.

## Generating a passphrase-protected key

Same command, just drop `-N ""` so it prompts you interactively — works the same on
both platforms:

```bash
ssh-keygen -t ed25519 -C "your-label-here" -f ~/.ssh/id_example
```

```powershell
ssh-keygen -t ed25519 -C "your-label-here" -f $HOME\.ssh\id_example
```

You'll be asked to enter (and confirm) a passphrase. Use a real one — an empty
passphrase here just silently produces the first kind of key.

## Not retyping the passphrase every time

An SSH agent caches the decrypted key for your session so you only enter the
passphrase once, not on every connection.

**macOS** — add the key to the Keychain-backed agent (macOS starts `ssh-agent`
automatically, no separate step needed):

```bash
ssh-add --apple-use-keychain ~/.ssh/id_example
```

To have this happen automatically for future terminal sessions, add to
`~/.ssh/config`:

```
Host *
  AddKeysToAgent yes
  UseKeychain yes
```

**Windows 11** — start the built-in agent service once (admin PowerShell), then add
the key:

```powershell
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent
ssh-add $HOME\.ssh\id_example
```

## Using a non-default key

Every example above uses a custom filename instead of the default `id_ed25519`, so
`ssh` won't pick it up automatically — you have to tell it which key to use.

### Per-command, with `-i`

```bash
ssh -i ~/.ssh/id_example user@host
scp -i ~/.ssh/id_example file.txt user@host:/path
```

This is what `docs/HETZNER_DEPLOY.md` and `docs/WEBSTORM_PG_SETUP.md` do throughout,
since `id_hetzner` isn't the default key either.

### Per-host, in `~/.ssh/config` (also fixes tools without an `-i` flag)

`-i` only works for commands that expose it directly — plain `git clone
git@host:...`, or any tool that shells out to `ssh` internally, has no way to pass
one. Add a block to `~/.ssh/config` (`$HOME\.ssh\config` on Windows — same syntax)
instead:

```
Host myserver
  HostName host.example.com
  User deploy
  IdentityFile ~/.ssh/id_example
  IdentitiesOnly yes
```

Then `ssh myserver` (or `scp file.txt myserver:/path`) uses `id_example`
automatically — no `-i` needed anywhere. `IdentitiesOnly yes` matters as soon as you
have more than one key: without it, `ssh` offers every key it knows about (including
ones already loaded in the agent for other hosts) before this one, and a server that
limits login attempts can lock you out before it ever gets to the right key.

For GitHub specifically, don't override the implicit `Host github.com` — add an
alias instead, so your normal GitHub identity stays untouched:

```
Host github.com-example
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_example
  IdentitiesOnly yes
```

```bash
git clone git@github.com-example:org/repo.git
```

## What you end up with, and where it goes

Two files: `id_example` (private — never share, never commit, keep `chmod 600` on
macOS) and `id_example.pub` (public — safe to share, this is what you hand out).

- **GitHub personal SSH access**: paste `id_example.pub` into
  `github.com → Settings → SSH and GPG keys`.
- **A server's `authorized_keys`**: on macOS, `ssh-copy-id -i ~/.ssh/id_example.pub
user@host` does it in one step. Windows has no built-in `ssh-copy-id`; append the
  `.pub` contents manually instead:
  ```powershell
  Get-Content $HOME\.ssh\id_example.pub | ssh user@host "cat >> ~/.ssh/authorized_keys"
  ```
- **A CI secret store** (passphrase-free keys only): e.g. this repo's
  `HETZNER_SSH_KEY` GitHub Secret — see `docs/HETZNER_DEPLOY.md` step 8 for the exact
  `gh secret set` command.

## Verifying a key locally (no server needed)

Useful right after generating a key, or to rule out "is the key itself broken"
before troubleshooting a failed remote connection.

**The private and public files actually match** — regenerate the public key from the
private one and compare (same command on macOS and Windows):

```bash
ssh-keygen -y -f ~/.ssh/id_example
```

Output should be byte-for-byte identical to `cat ~/.ssh/id_example.pub`. A mismatch
usually means the `.pub` is stale — e.g. left over from a key you regenerated at the
same path — since `ssh-keygen -f existing-name` overwrites the private key but
prompts before touching an existing `.pub` (or worse, `id_example.pub` and
`id_example` belong to two different key pairs entirely).

**The passphrase is correct** (passphrase-protected keys only) — this decrypts the
key locally without touching the network at all, so a wrong passphrase fails
immediately instead of after connecting to a real host:

```bash
ssh-keygen -y -f ~/.ssh/id_example   # prompts for the passphrase
```

**Which key an agent would actually offer** — once several keys are loaded, it's easy
to lose track of which is which. Compare fingerprints to confirm the one you expect
is actually loaded:

```bash
ssh-add -l                            # fingerprints of everything currently loaded
ssh-keygen -lf ~/.ssh/id_example.pub  # fingerprint of this specific key
```

**File permissions aren't too open** (macOS/Linux only — SSH silently refuses to use
a private key that's group/world-readable):

```bash
ls -l ~/.ssh/id_example
# should show -rw------- ; if not:
chmod 600 ~/.ssh/id_example
```

## Verifying against a server

```bash
ssh -i ~/.ssh/id_example user@host whoami
```

Should return the remote username without prompting for a password. A
passphrase-protected key will prompt once per agent session (or every time, if you
skipped the agent setup above); a passphrase-free key should never prompt at all.
