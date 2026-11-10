# Setting up Resend for sign-in and invite emails

Not needed for a working deploy. `getMailer()`
(`backend/src/infrastructure/mail/get-mailer.ts`) uses the console mailer unless
both `RESEND_API_KEY` and `EMAIL_FROM` are set: sign-in and invite links are then
only written to the API log (`docker compose -f docker-compose.prod.yml logs api |
grep mailer`). That's fine for testing, but neighbors can't receive invites by
email until this is done.

Resend only sends from a domain you have verified. A `gmail.com` sender is
rejected ("gmail.com domain is not verified"), so `EMAIL_FROM` must be on a
domain whose DNS you control.

## Steps

1. Sign up at [resend.com](https://resend.com) (the free tier is enough).
2. **Domains → Add Domain**: use a sending subdomain such as `mail.cowglow.io`,
   so its reputation is separate from `cowglow.io`. If the visual directory
   already verified one, reuse it.
3. Add the DNS records Resend shows (an `MX` and `TXT`/DKIM records under the
   `mail` host) at IONOS: **Domains & SSL → cowglow.io → DNS → Add record**. The
   host field wants only the part before `cowglow.io`, e.g. `mail` or
   `resend._domainkey.mail`. Copy the values from Resend, don't retype them.
4. **Verify** in Resend. If it is stuck, compare each record, and check with e.g.
   `dig +short TXT resend._domainkey.mail.cowglow.io`.
5. **API Keys → Create API Key** (sending access only).
6. Set both secrets, then redeploy (`deploy.yml` writes them into the server's `.env`):

   ```bash
   gh secret set RESEND_API_KEY --repo cowglow/halloween-trick-o-treating-opt-in --body "re_..."
   gh secret set EMAIL_FROM --repo cowglow/halloween-trick-o-treating-opt-in \
     --body "Meckenhausen Halloween map <login@mail.cowglow.io>"
   gh workflow run deploy.yml --repo cowglow/halloween-trick-o-treating-opt-in
   ```

7. Test: request a sign-in link for the seeded participant on the live site. The
   email should arrive, and the API log should have **no** `[mailer]` line for it.

## After the event

Delete the API key in Resend. If the sending subdomain was set up only for this
map, remove its records at IONOS too (see [`TEARDOWN.md`](./TEARDOWN.md)).
