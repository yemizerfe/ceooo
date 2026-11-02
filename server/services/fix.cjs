const fs = require("fs");
let c = fs.readFileSync("d:\\Documents\\realprojects\\ceoapp\\server\\services\\ai.service.ts", "utf8");
let i = c.indexOf("if (prompt.includes");
if (i >= 0) {
  let j = c.indexOf("});", i);
  if (j >= 0) {
    j = c.indexOf(";", j) + 1;
    c = c.substring(0, i) + c.substring(j);
  }
}
fs.writeFileSync("d:\\Documents\\realprojects\\ceoapp\\server\\services\\ai.service.ts", c);
console.log("Done");