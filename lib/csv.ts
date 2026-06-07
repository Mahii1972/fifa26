import { readFileSync } from "fs";
import { join } from "path";

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function readCsv(filename: string): Record<string, string>[] {
  const filePath = join(process.cwd(), "data", filename);
  const content = readFileSync(filePath, "utf-8").trim();
  const lines = content.split("\n");
  const headers = parseLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return headers.reduce<Record<string, string>>((row, header, i) => {
      row[header] = values[i] ?? "";
      return row;
    }, {});
  });
}

export function num(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function bool(value: string): boolean {
  return value.toUpperCase() === "TRUE";
}