# Checking on sign-ups

How to see what happened to someone who asked to join: whether their request
is still waiting, whether a participant let them in, and whether they used the
invite. Everything here only reads; nothing changes the data.

## 1. Without the server: the Resend log

The quickest check, from the Resend dashboard (**Emails**) or the Resend
plugin in Claude Code. The subjects tell the story:

| Subject | What happened |
| --- | --- |
| "Someone asked to join …" / "Jemand möchte … mitmachen" / "Alguien pidió unirse …" | A request arrived and the waiting list was empty, so every participant got this notice. |
| "You're invited …" / "Du bist … eingeladen" / "Estás invitado …" | A participant sent an invite, or allowed a request (that sends an invite too). |
| "Your sign-in link" / "Dein Anmeldelink" / "Tu enlace de acceso" | Someone already on the map signed in. |

A notice followed by an invite to a new address a few minutes later usually
means a participant let the person in. Resend can't tell you whether the
invite was then used: for that, see step 3, or (once it's deployed) the
"Recently answered" part of **Requests to join** on the map.

Only one notice goes out per batch: a second request that arrives while the
first is still waiting sends no email. So one notice can stand for several
requests.

## 2. Connect to the database

From this repo, on your machine:

```bash
ssh -i cert/id_hetzner_admin deploy@YOUR_SERVER_IP
cd /opt/halloween-map
```

Every query below runs through this one command, with the session set to
read-only, so a typo can't change anything:

```bash
q() { docker compose -f docker-compose.prod.yml exec -T -e PGOPTIONS='-c default_transaction_read_only=on' db \
  sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -P pager=off' <<< "$1"; }
```

(Paste that line once per SSH session; `q "..."` then runs a query.) Times in
the database are UTC; the queries convert them to Meckenhausen time.

## 3. The queries

**Requests still waiting** (nobody has answered them yet):

```bash
q "SELECT to_char((\"createdAt\" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin', 'DD.MM. HH24:MI') AS asked,
          email, message
   FROM \"SpaceAccessRequest\" ORDER BY \"createdAt\";"
```

**Recent invites and whether they were used**, newest first, with who sent
them (an allowed request shows up here as an invite from whoever allowed it):

```bash
q "SELECT to_char((i.\"createdAt\" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin', 'DD.MM. HH24:MI') AS sent,
          i.email, i.role,
          CASE WHEN i.\"usedAt\" IS NOT NULL THEN 'joined'
               WHEN i.\"revokedAt\" IS NOT NULL THEN 'revoked'
               WHEN i.\"expiresAt\" < now() AT TIME ZONE 'UTC' THEN 'expired'
               ELSE 'not joined yet' END AS status,
          p.email AS sent_by
   FROM \"SpaceInvite\" i JOIN \"SpaceParticipant\" p ON p.id = i.\"inviterParticipantId\"
   WHERE i.\"deletedAt\" IS NULL
   ORDER BY i.\"createdAt\" DESC LIMIT 20;"
```

**One person**, by email (replace the address in both places):

```bash
q "SELECT 'participant' AS what, role::text AS detail, \"createdAt\" FROM \"SpaceParticipant\" WHERE email = 'person@example.com'
   UNION ALL
   SELECT 'invite', CASE WHEN \"usedAt\" IS NOT NULL THEN 'joined' WHEN \"revokedAt\" IS NOT NULL THEN 'revoked'
                         WHEN \"expiresAt\" < now() AT TIME ZONE 'UTC' THEN 'expired' ELSE 'not joined yet' END, \"createdAt\"
     FROM \"SpaceInvite\" WHERE email = 'person@example.com'
   UNION ALL
   SELECT 'request waiting', message, \"createdAt\" FROM \"SpaceAccessRequest\" WHERE email = 'person@example.com';"
```

No rows at all: they never asked with that address (check for a typo), or a
participant denied their request (denying deletes it and keeps nothing).

**Who's on the map**, as counts:

```bash
q "SELECT p.role, count(*) AS people, count(l.id) AS with_a_pin
   FROM \"SpaceParticipant\" p LEFT JOIN \"SpaceLocation\" l ON l.\"participantId\" = p.id
   GROUP BY p.role;"
```

## 4. What to do about it

- **Status "joined"**: they're in. If they joined as a visitor but hand out
  sweets, there's no way to change a role: they use "Remove me from the map",
  and any participant invites them again choosing "Add their house and invite
  others".
- **"not joined yet"**: the invite is in their inbox, or their spam folder. Tell
  them to look for "Du bist zur Meckenhausener Halloween-Karte eingeladen"
  (or the English/Spanish subject) from `login@mail.cowglow.io`. The link
  works once, until the event ends.
- **"expired" or "revoked"**, or the email bounced in Resend: any participant
  can send a fresh invite from **Invite neighbors** in the menu.
- **A request still waiting**: answer it in the app (**Requests to join**).

Don't copy these results anywhere that outlives the event: they contain the
addresses the privacy notice promises to delete at midnight after Halloween.
