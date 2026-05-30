require("dotenv").config();

const { Client, GatewayIntentBits, Events } = require("discord.js");
const { Client: NotionClient } = require("@notionhq/client");

const requiredEnv = ["DISCORD_TOKEN", "NOTION_TOKEN", "NOTION_DATABASE_ID"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
}

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const notion = new NotionClient({ auth: process.env.NOTION_TOKEN });

discord.once(Events.ClientReady, (client) => {
  console.log(`Logged in as ${client.user.tag}`);
});

discord.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!notion ")) return;

  const text = message.content.replace(/^!notion\s+/i, "").trim();
  if (!text) {
    await message.reply("Please send a memo like: !notion your memo");
    return;
  }

  try {
    await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: text.slice(0, 100)
              }
            }
          ]
        }
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: text
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: `Discord: ${message.author.tag} / #${message.channel.name}`
                }
              }
            ]
          }
        }
      ]
    });

    await message.reply("Saved to Notion.");
  } catch (error) {
    console.error(error);
    await message.reply("Failed to save to Notion. Check Render logs.");
  }
});

discord.login(process.env.DISCORD_TOKEN);
