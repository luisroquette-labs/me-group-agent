# ADR 0002: Keep group actions and AI costs scoped

## Context

The bot can operate in both Telegram and WhatsApp. Group IDs from the two services are not interchangeable, and some moderation actions have different API requirements. AI replies and daily summaries can spend a configured API key's credits.

## Decision

Normalize WhatsApp participant IDs before comparing them with the bot's own ID, since a device suffix can appear on one form. Deleting another member's WhatsApp group message requires the author's participant ID and group-admin access. In Telegram, removing a member bans and then unbans them so they can rejoin; deleting a message needs only the chat and message IDs.

Run one scheduler across the enabled channels. An item without a channel is skipped when both channels are enabled. Daily summaries read messages from the selected channel and group only, using at most the latest 200 messages to bound input cost. AI replies have a per-group cooldown, and AI features are off by default so the bot can run without an API key.

Flood moderation triggers on the configured Nth message within the time window; the previous message is the last one allowed without action.

## Consequences

Ambiguous scheduled items do not send to the wrong group. Moderation respects each service's behavior. Summary input and reply frequency have bounds; a summary of a busy day may omit older messages.
