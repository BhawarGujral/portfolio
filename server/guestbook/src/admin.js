// Moderation from the command line (run on the phone over SSH):
//   npm run admin -- list [n]     show the latest n signatures, hidden ones included
//   npm run admin -- hide <id>    remove a signature from the public board
//   npm run admin -- show <id>    put a hidden signature back
//   npm run admin -- delete <id>  permanently delete a signature
import { fileURLToPath } from "node:url";
import { openDb } from "./db.js";

const DB_PATH =
  process.env.DB_PATH ?? fileURLToPath(new URL("../data/guestbook.db", import.meta.url));
const db = openDb(DB_PATH);
const [command, arg] = process.argv.slice(2);
const id = Number(arg);

switch (command) {
  case "list": {
    const rows = db.all(Number(arg) || 50);
    for (const r of rows) {
      console.log(`#${r.id}\t${r.hidden ? "HIDDEN" : "shown "}\t${r.createdAt}\t${r.name}`);
    }
    console.log(`${db.count()} shown on the board`);
    break;
  }
  case "hide":
  case "show":
    console.log(db.setHidden(id, command === "hide") ? `#${id} ${command === "hide" ? "hidden" : "shown"}` : `#${id} not found`);
    break;
  case "delete":
    console.log(db.remove(id) ? `#${id} deleted` : `#${id} not found`);
    break;
  default:
    console.log("Usage: npm run admin -- list [n] | hide <id> | show <id> | delete <id>");
}
db.close();
