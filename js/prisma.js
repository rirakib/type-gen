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

// Map Prisma types to TypeScript
function mapPrismaType(type, isOptional, enums) {
  type = type.toLowerCase();
  let tsType = "any";

  if (["string", "text", "uuid"].includes(type)) tsType = "string";
  else if (["int", "bigint", "float", "decimal", "double"].includes(type))
    tsType = "number";
  else if (["boolean", "bool"].includes(type)) tsType = "boolean";
  else if (["date", "datetime", "timestamp"].includes(type)) tsType = "Date";
  else if (enums[type]) tsType = toCamelCase(type); // use actual enum
  else if (type.startsWith("json")) tsType = "any";

  return tsType + (isOptional ? " | null" : "");
}

// Parse Prisma schema
function parsePrisma(content) {
  const enumRegex = /enum\s+(\w+)\s+{([\s\S]+?)^}/gm;
  const modelRegex = /model\s+(\w+)\s+{([\s\S]+?)^}/gm;
  const fieldRegex = /^\s*(\w+)\s+([^\s]+).*$/gm;

  const enums = {};
  let enumMatch;
  while ((enumMatch = enumRegex.exec(content)) !== null) {
    const enumName = enumMatch[1];
    const enumBody = enumMatch[2];
    const values = enumBody
      .split(/\s+/)
      .filter((v) => v && !v.startsWith("//"))
      .map((v) => v.replace(/[,]/g, ""));
    enums[enumName.toLowerCase()] = values;
  }

  const models = [];
  let modelMatch;
  while ((modelMatch = modelRegex.exec(content)) !== null) {
    const modelName = modelMatch[1];
    const modelBody = modelMatch[2];

    const fields = [];
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
      const name = fieldMatch[1];
      let typeRaw = fieldMatch[2];
      let isOptional = typeRaw.endsWith("?");

      const typeClean = isOptional ? typeRaw.slice(0, -1) : typeRaw;

      const isArray = typeClean.endsWith("[]");
      let tsType = mapPrismaType(
        isArray ? typeClean.slice(0, -2) : typeClean,
        isOptional,
        enums
      );
      if (isArray) tsType += "[]";

      fields.push({ name, type: tsType, optional: isOptional });
    }

    models.push({ modelName, fields });
  }

  return { models, enums };
}

// Generate TypeScript
function generateTS({ models, enums }) {
  let ts = "";

  // Generate enums first
  for (const key in enums) {
    const enumName = toCamelCase(key);
    const values = enums[key].map((v) => `'${v}'`).join(" | ");
    ts += `export type ${enumName} = ${values};\n\n`;
  }

  // Generate models
  ts += models
    .map(({ modelName, fields }) => {
      const interfaceName = toCamelCase(modelName);
      let tsInterface = `export interface ${interfaceName} {\n`;
      fields.forEach((f) => {
        tsInterface += `  ${f.name}${f.optional ? "?" : ""}: ${f.type};\n`;
      });
      tsInterface += "}";
      return tsInterface;
    })
    .join("\n\n");

  return ts;
}

// Generate button click
generateBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) return alert("Upload a Prisma schema file first.");

  const reader = new FileReader();
  reader.onload = () => {
    const parsed = parsePrisma(reader.result);
    tsOutput.textContent = generateTS(parsed);
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
