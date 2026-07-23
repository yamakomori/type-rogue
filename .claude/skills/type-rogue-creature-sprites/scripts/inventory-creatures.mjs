#!/usr/bin/env node

import { existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(option("--root") ?? process.cwd());
const asJson = process.argv.includes("--json");
const fishFile = join(root, "src/domain/fish.js");

if (!existsSync(fishFile)) {
  console.error(`fish data not found: ${fishFile}`);
  process.exit(1);
}

const moduleUrl = `${pathToFileURL(fishFile).href}?inventory=${Date.now()}`;
const { FISH_SPECIES } = await import(moduleUrl);

function duplicatesFor(key) {
  const seen = new Map();
  for (const species of FISH_SPECIES) {
    const value = species[key];
    if (!seen.has(value)) seen.set(value, []);
    seen.get(value).push(species.id);
  }
  return [...seen.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([value, ids]) => ({ value, ids }));
}

function pngFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter((name) => name.endsWith(".png")).sort();
}

const conceptDirectory = join(root, "concept_art/sprites");
const publicDirectory = join(root, "public/sprites");
const conceptFiles = pngFiles(conceptDirectory);
const publicFiles = pngFiles(publicDirectory);
const referencedSprites = FISH_SPECIES
  .filter((species) => species.sprite)
  .map((species) => ({
    id: species.id,
    name: species.name,
    src: species.sprite.src,
    publicExists: existsSync(join(root, "public", species.sprite.src.replace(/^\//, ""))),
    conceptExists: existsSync(join(conceptDirectory, species.sprite.src.split("/").at(-1))),
  }));

const referencedNames = new Set(referencedSprites.map((entry) => entry.src.split("/").at(-1)));
const result = {
  root,
  speciesCount: FISH_SPECIES.length,
  spriteSpeciesCount: referencedSprites.length,
  duplicateIds: duplicatesFor("id"),
  duplicateNames: duplicatesFor("name"),
  species: FISH_SPECIES.map((species) => ({
    id: species.id,
    name: species.name,
    habitat: species.habitat,
    regionId: species.regionId,
    stages: species.stages,
    sprite: species.sprite?.src ?? null,
  })),
  referencedSprites,
  unassignedConceptFiles: conceptFiles.filter((name) => !referencedNames.has(name)),
  unassignedPublicFiles: publicFiles.filter((name) => !referencedNames.has(name)),
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Species: ${result.speciesCount} / sprites: ${result.spriteSpeciesCount}`);
  console.log("ID\tNAME\tHABITAT\tSTAGES\tSPRITE");
  for (const species of result.species) {
    console.log([
      species.id,
      species.name,
      species.habitat,
      species.stages.join(","),
      species.sprite ?? "-",
    ].join("\t"));
  }
  if (result.unassignedConceptFiles.length) {
    console.log(`Unassigned concept PNG: ${result.unassignedConceptFiles.join(", ")}`);
  }
  if (result.unassignedPublicFiles.length) {
    console.log(`Unassigned public PNG: ${result.unassignedPublicFiles.join(", ")}`);
  }
}

const missingSprites = referencedSprites.filter((entry) => !entry.publicExists || !entry.conceptExists);
if (result.duplicateIds.length || result.duplicateNames.length || missingSprites.length) {
  if (result.duplicateIds.length) console.error("Duplicate species IDs:", result.duplicateIds);
  if (result.duplicateNames.length) console.error("Duplicate species names:", result.duplicateNames);
  if (missingSprites.length) console.error("Missing sprite copies:", missingSprites);
  process.exit(1);
}
