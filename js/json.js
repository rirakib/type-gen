/* =========================================================
   DOM ELEMENTS
========================================================= */
const fileInput = document.getElementById("fileInput");
const jsonInput = document.getElementById("jsonInput");
const tsOutput = document.getElementById("tsOutput");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");

/* =========================================================
   STATE MANAGEMENT
========================================================= */
let interfaces = []; // Stores generated interface strings
let interfaceNames = new Set(); // Tracks used names to prevent duplicates

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

// Convert string to PascalCase (e.g., user_id -> UserId)
function toPascalCase(str) {
  // Remove special characters and split by non-alphanumeric
  const words = str.replace(/[^a-zA-Z0-9]/g, " ").split(/\s+/);
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

// Ensure unique interface names (e.g., Item, Item2, Item3)
function getUniqueName(name) {
  let uniqueName = toPascalCase(name);
  let counter = 2;
  while (interfaceNames.has(uniqueName)) {
    uniqueName = `${toPascalCase(name)}${counter}`;
    counter++;
  }
  interfaceNames.add(uniqueName);
  return uniqueName;
}

// Determine basic TypeScript type
function getSimpleType(value) {
  if (value === null) return "any";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "any";
}

/* =========================================================
   CORE GENERATION LOGIC
========================================================= */

/**
 * Main recursive function to parse JSON and build interfaces
 * @param {Object} obj - The JSON object or array to parse
 * @param {String} name - The suggested name for the interface
 * @returns {String} - The type name (e.g., "string", "User[]", "Root")
 */
function parseValue(obj, name) {
  // 1. Handle Null / Undefined
  if (obj === null || obj === undefined) return "any";

  // 2. Handle Arrays
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "any[]";

    // Check if it's an array of primitives
    const firstType = getSimpleType(obj[0]);
    const isPrimitiveArray = obj.every(
      (item) => typeof item !== "object" || item === null
    );

    if (isPrimitiveArray) {
      return `${firstType}[]`;
    }

    // It's an array of objects: Merge all objects to find all potential keys
    const mergedObject = {};
    obj.forEach((item) => {
      if (typeof item === "object" && item !== null) {
        Object.keys(item).forEach((key) => {
          mergedObject[key] = item[key];
        });
      }
    });

    // Recursively parse the merged object structure
    const interfaceName = parseValue(mergedObject, name);
    return `${interfaceName}[]`;
  }

  // 3. Handle Objects
  if (typeof obj === "object") {
    const interfaceName = getUniqueName(name);
    let output = `export interface ${interfaceName} {\n`;

    Object.entries(obj).forEach(([key, value]) => {
      // Recursive call for nested values
      // We use the key as the suggested name for the child interface
      const type = parseValue(value, key);
      
      // Add '?' if value is null in original data (optional enhancement)
      // For now, we assume all keys present are required unless we implemented strict undefined checks
      output += `  ${key}: ${type};\n`;
    });

    output += `}`;
    interfaces.push(output); // Store interface in the global array
    return interfaceName;
  }

  // 4. Handle Primitives
  return getSimpleType(obj);
}

/* =========================================================
   EVENT HANDLERS
========================================================= */

// Generate Button Click
generateBtn.addEventListener("click", () => {
  // Reset State
  interfaces = [];
  interfaceNames = new Set();
  tsOutput.textContent = "";

  let jsonData;

  // Helper to run the process
  const runGeneration = (data) => {
    try {
      // Start parsing from Root
      // Note: We parse, but we are interested in the side-effect (filling the 'interfaces' array)
      parseValue(data, "Root");

      // The recursive function pushes children first, then parents.
      // We usually want Root at the top, so we reverse the array.
      tsOutput.textContent = interfaces.reverse().join("\n\n");
    } catch (err) {
      console.error(err);
      tsOutput.textContent = "Error generating types: " + err.message;
    }
  };

  // Check Input Source
  if (fileInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        jsonData = JSON.parse(reader.result);
        runGeneration(jsonData);
      } catch (err) {
        alert("Invalid JSON file. Please check the syntax.");
      }
    };
    reader.readAsText(fileInput.files[0]);
  } else {
    const rawValue = jsonInput.value.trim();
    if (!rawValue) {
      alert("Please paste JSON or upload a file.");
      return;
    }
    try {
      jsonData = JSON.parse(rawValue);
      runGeneration(jsonData);
    } catch (err) {
      alert("Invalid JSON format. Please check for trailing commas or missing quotes.");
    }
  }
});

// Copy Button Click
copyBtn.addEventListener("click", () => {
  const content = tsOutput.textContent;
  if (!content) return;

  navigator.clipboard.writeText(content).then(() => {
    const originalText = copyBtn.innerText;
    copyBtn.innerText = "Copied!";
    setTimeout(() => {
      copyBtn.innerText = originalText;
    }, 2000);
  });
});