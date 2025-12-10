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

// Map Laravel types to TypeScript
function mapType(ltype) {
  ltype = ltype.toLowerCase();
  if (
    ltype.includes("string") ||
    ltype.includes("text") ||
    ltype.includes("char")
  )
    return "string";
  if (
    ltype.includes("integer") ||
    ltype.includes("bigint") ||
    ltype.includes("float") ||
    ltype.includes("double") ||
    ltype.includes("decimal") ||
    ltype.includes("year")
  )
    return "number";
  if (ltype.includes("boolean") || ltype.includes("tinyint")) return "boolean";
  if (ltype.includes("json") || ltype.includes("jsonb")) return "any";
  if (
    ltype.includes("timestamp") ||
    ltype.includes("datetime") ||
    ltype.includes("date") ||
    ltype.includes("time")
  )
    return "Date";
  if (ltype.includes("array")) return "any[]";
  if (ltype.includes("uuid")) return "string";
  if (ltype.includes("binary") || ltype.includes("blob")) return "any";
  if (ltype.includes("ipAddress") || ltype.includes("macAddress"))
    return "string";
  return "any";
}

// Parse migration content
function parseMigration(content) {
  const lines = content.split("\n");
  const columnsMap = {};

  const tableMatch = content.match(/Schema::create\(['"](\w+)['"]/);
  const tableName = tableMatch ? tableMatch[1] : "MyTable";

  lines.forEach((line) => {
    line = line.trim();

    // Handle enum
    const enumMatch = line.match(
      /\$table->enum\(['"](\w+)['"],\s*\[([^\]]+)\]\)/
    );
    if (enumMatch) {
      const columnName = enumMatch[1];
      const values = enumMatch[2]
        .split(",")
        .map((v) => v.trim().replace(/['"]/g, ""));
      columnsMap[columnName] = {
        name: columnName,
        type: values.map((v) => `'${v}'`).join(" | "),
        nullable: line.includes("->nullable()"),
      };
      return;
    }

    // Handle general types
    const match = line.match(/\$table->(\w+)\(['"](\w+)['"]/);
    if (match) {
      const laravelType = match[1];
      const columnName = match[2];
      columnsMap[columnName] = {
        name: columnName,
        type: mapType(laravelType),
        nullable: line.includes("->nullable()"),
      };
    }
  });

  const columns = Object.values(columnsMap);
  return { tableName, columns };
}

// Generate TypeScript interface
function generateTS({ tableName, columns }) {
  const interfaceName = toCamelCase(tableName);
  let ts = `export interface ${interfaceName} {\n`;
  columns.forEach((col) => {
    ts += `  ${col.name}${col.nullable ? "?" : ""}: ${col.type};\n`;
  });
  ts += "}";
  return ts;
}

// Generate button click
generateBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) return alert("Upload a Laravel migration file first.");

  const reader = new FileReader();
  reader.onload = () => {
    const migrationData = parseMigration(reader.result);
    tsOutput.textContent = generateTS(migrationData);
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
