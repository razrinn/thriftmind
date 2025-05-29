# Project Brief: ThriftMind

**Last Updated:** May 29, 2025

## 1. Project Title

ThriftMind

## 2. Objective

To develop a Telegram bot that allows users to track the prices of items from various online marketplaces and receive notifications when prices drop, helping users save money on their desired purchases.

## 3. Core Functionality

- **Item Tracking:** Users can submit URLs of items from supported online marketplaces.
- **Automated Price Scraping:** The system will periodically (e.g., daily or more frequently for premium users) scrape the product pages to fetch the current price.
- **Price Drop Notifications:** Users will receive a Telegram notification when the price of a tracked item decreases.
- **Data Storage:** Maintain a database of users, tracked items, and price history.

## 4. Target Platform & Architecture

- **User Interface:** Telegram Bot.
  - Users interact via commands.
  - Notifications are delivered via Telegram messages.
- **Backend Infrastructure:** Cloudflare Workers (Serverless).
  - **Bot Logic:** A Worker to handle incoming Telegram updates (webhooks) and process user commands.
  - **Scraping Engine:** A Worker, potentially triggered by Cloudflare Cron Triggers, to perform scheduled web scraping tasks.
  - **Data Storage:** Cloudflare Workers KV for storing user data, tracked items, and recent prices. Cloudflare D1 could be considered for more relational data needs if KV becomes limiting.
  - **Scheduling:** Cloudflare Cron Triggers for initiating daily/periodic scraping jobs.

## 5. Key Features (User-Facing Bot Commands)

- `/start`: Welcome message and basic instructions.
- `/add <item_URL> [target_price]`: Allows users to add a new item to track. `target_price` is an optional parameter to only notify if the price drops below a certain threshold.
- `/myitems`: Lists all items currently being tracked by the user, showing current price and perhaps last checked date.
- `/remove <item_identifier>`: Allows users to stop tracking an item (identifier could be the URL or a short ID assigned by the bot).
- `/settings` (Optional): Allow users to configure notification preferences (e.g., notification frequency, types of price drops).
- **Automated Notifications:** Sent when a price drops for a tracked item.

## 6. Proposed Technical Stack (High-Level)

- **Programming Language (Cloudflare Workers):** JavaScript or TypeScript.
- **Telegram Bot Interaction:** Telegram Bot API (via `fetch` calls from the Worker).
- **Web Scraping:**
  - `fetch` API in Cloudflare Workers to retrieve HTML content.
  - `cheerio` (or a similar lightweight HTML parsing library compatible with Workers) to extract price information.
- **Data Storage:**
  - Cloudflare Workers KV (primary choice for key-value data like user-item mappings, item details).
  - Cloudflare D1 (SQLite-compatible, if more complex queries or relational data structures are needed).
- **Scheduling:** Cloudflare Cron Triggers.

## 7. Monetization Strategies (To Be Explored)

- **Freemium Model:**
  - **Free Tier:** Limited number of tracked items (e.g., 3-5), standard check frequency.
  - **Premium Tier(s):** Subscription-based (monthly/annually) offering:
    - Increased number of tracked items.
    - More frequent price checks.
    - Advanced notification options (e.g., percentage drop, specific target price hit).
    - Price history charts.
    - Ad-free experience.
- **Affiliate Marketing:**
  - Use affiliate links when directing users to marketplace item pages.
  - Disclose the use of affiliate links to users.
- **Advertising (with caution):**
  - Minimal, non-intrusive ads in the free tier.
- **Donations:**
  - Option for users to support the bot's development.

## 8. Success Criteria

- **Reliability:** Accurate and consistent price scraping from supported marketplaces.
- **Timeliness:** Prompt notifications to users upon price drops.
- **User Adoption:** A growing base of active users.
- **User Satisfaction:** Positive feedback and high retention rates.
- **Scalability:** The system can handle an increasing number of users and tracked items efficiently.
- **Monetization (if implemented):** Ability to generate revenue to cover operational costs and development.

## 9. Potential Challenges & Considerations

- **Scraper Maintenance:** Marketplaces frequently change their website structure, which will require ongoing updates to the scraping logic.
- **Anti-Scraping Measures:** Marketplaces may implement measures (CAPTCHAs, IP blocking) to prevent scraping. Strategies to mitigate this will be needed (e.g., rotating user agents, careful request rates, potentially exploring Cloudflare's Browser Rendering API if simple `fetch` is insufficient, though this adds cost/complexity).
- **Scalability of Scraping:** Ensuring the scraping process can handle a large volume of items without excessive execution time or hitting Cloudflare Worker limits. Batch processing or distributed tasks might be necessary.
- **Resource Limits on Cloudflare Workers:** Adhering to CPU time, memory, and execution duration limits, especially for scraping tasks.
- **Error Handling:** Robust error handling for network issues, changes in page structure, or items becoming unavailable.
- **Data Privacy:** Securely handling user data and being transparent about data usage, especially if considering anonymized data insights.
- **Marketplace Coverage:** Initially focus on a few key marketplaces and expand gradually.
- **User Agent Management:** Using appropriate user agents to mimic browser requests.
