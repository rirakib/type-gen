const contentTypeEl = document.getElementById("contentType");
const interfaceNameEl = document.getElementById("interfaceName");
const postmanDataEl = document.getElementById("postmanData");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const tsOutput = document.getElementById("tsOutput");

// Detect type of value
function detectType(value) {
  if (value === null) return "any";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "string";
  if (Array.isArray(value)) return "any[]";
  if (typeof value === "object") return "any";
  return "any";
}

// Parse form-data or x-www-form-urlencoded text
function parseKeyValueData(text) {
  const obj = {};
  const lines = text.split("\n");
  lines.forEach((line) => {
    if (!line.trim()) return;
    let key, value;
    if (line.includes("=")) [key, value] = line.split("=");
    else if (line.includes(":")) [key, value] = line.split(":");
    else {
      key = line.trim();
      value = "";
    }
    key = key.trim();
    value = value.trim();
    if (!isNaN(value) && value !== "") value = Number(value);
    else if (value.toLowerCase() === "true") value = true;
    else if (value.toLowerCase() === "false") value = false;
    obj[key] = value;
  });
  return obj;
}

// Generate TypeScript Interface
function generateTSInterface(obj, interfaceName) {
  let ts = `export interface ${interfaceName} {\n`;
  for (const key in obj) {
    const value = obj[key];
    const type = detectType(value);
    ts += `  ${key}${value === null ? "?" : ""}: ${type};\n`;
  }
  ts += "}";
  return ts;
}

// Generate button click
generateBtn.addEventListener("click", () => {
  const contentType = contentTypeEl.value;
  const interfaceName = interfaceNameEl.value.trim() || "MyInterface";
  let obj = {};

  try {
    if (contentType === "raw") obj = JSON.parse(postmanDataEl.value);
    else obj = parseKeyValueData(postmanDataEl.value);
  } catch (err) {
    alert("Invalid data format! Check your JSON or key-value data.");
    return;
  }

  tsOutput.textContent = generateTSInterface(obj, interfaceName);
});

// Copy button click
copyBtn.addEventListener("click", () => {
  if (!tsOutput.textContent) return alert("Nothing to copy!");
  navigator.clipboard
    .writeText(tsOutput.textContent)
    .then(() => alert("TypeScript interface copied to clipboard!"))
    .catch((err) => alert("Failed to copy: " + err));
});
