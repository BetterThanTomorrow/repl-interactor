import { ReplConsole } from "./repl-console";

let console = new ReplConsole(document.querySelector(".repl"));

document.addEventListener("DOMContentLoaded", () => {
    console.input.focus();
})