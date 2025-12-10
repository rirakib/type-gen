const fileInput = document.getElementById("fileInput");
const tsOutput = document.getElementById("tsOutput");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");

// Convert snake_case to CamelCase
function toCamelCase(str) {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

// Map SQL types to TypeScript
function mapType(sqlType, enumValues = null) {
  if (enumValues) return enumValues.map((v) => `'${v}'`).join(" | ");

  sqlType = sqlType.toLowerCase();
  if (
    sqlType.includes("char") ||
    sqlType.includes("text") ||
    sqlType.includes("varchar")
  )
    return "string";
  if (
    sqlType.includes("int") ||
    sqlType.includes("decimal") ||
    sqlType.includes("float") ||
    sqlType.includes("double") ||
    sqlType.includes("numeric") ||
    sqlType.includes("bigint")
  )
    return "number";
  if (sqlType.includes("bool") || sqlType.includes("tinyint(1)"))
    return "boolean";
  if (sqlType.includes("json")) return "any";
  if (
    sqlType.includes("date") ||
    sqlType.includes("time") ||
    sqlType.includes("timestamp")
  )
    return "Date";
  return "any";
}

// Parse SQL CREATE TABLE
function parseSQL(content) {
  const tableRegex =
    /CREATE TABLE [`"]?(\w+)[`"]?\s*\(([\s\S]+?)\)\s*ENGINE=/gi;

  const tables = [];
  let tableMatch;

  while ((tableMatch = tableRegex.exec(content)) !== null) {
    const tableName = tableMatch[1];
    const tableBody = tableMatch[2].split("\n");

    const columns = [];
    tableBody.forEach((line) => {
      line = line.trim();

      // Skip constraints
      if (
        !line ||
        line.startsWith("PRIMARY KEY") ||
        line.startsWith("UNIQUE") ||
        line.startsWith("KEY") ||
        line.startsWith("CONSTRAINT")
      )
        return;

      // ENUM detection
      const enumMatch = line.match(/^`?(\w+)`?\s+enum\s*\(([^)]+)\)(.*?),?$/i);
      if (enumMatch) {
        const name = enumMatch[1];
        const values = enumMatch[2]
          .split(",")
          .map((v) => v.trim().replace(/'/g, "").replace(/"/g, ""));
        const nullable = !/not null/i.test(enumMatch[3]);
        columns.push({ name, type: mapType("enum", values), nullable });
        return;
      }

      // Regular column
      const match = line.match(/^`?(\w+)`?\s+([\w()]+)(.*?)(?:,|$)/i);
      if (match) {
        const name = match[1];
        const type = mapType(match[2]);
        const nullable = !/not null/i.test(match[3]);
        columns.push({ name, type, nullable });
      }
    });

    tables.push({ tableName, columns });
  }

  return tables;
}

// Generate TypeScript interface
function generateTS(tables) {
  return tables
    .map(({ tableName, columns }) => {
      const interfaceName = toCamelCase(tableName);
      let ts = `export interface ${interfaceName} {\n`;
      columns.forEach((col) => {
        ts += `  ${col.name}${col.nullable ? "?" : ""}: ${col.type};\n`;
      });
      ts += "}";
      return ts;
    })
    .join("\n\n");
}

// Generate button click
generateBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) return alert("Upload a SQL file first.");

  const reader = new FileReader();
  reader.onload = () => {
    const tables = parseSQL(reader.result);
    tsOutput.textContent = generateTS(tables);
  };
  reader.readAsText(file);
});

// Copy button click
copyBtn.addEventListener("click", () => {
  if (!tsOutput.textContent) return alert("Nothing to copy!");
  navigator.clipboard
    .writeText(tsOutput.textContent)
    .then(() => alert("Copied to clipboard!"))
    .catch((err) => alert("Failed to copy: " + err));
});
