#!/usr/bin/env node
/**
 * Apply the approved rack / standard / base prices to every managed course.
 * Run on the GCE VM after git pull:
 *   cd /var/www/lms && node scripts/apply-standard-course-pricing.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = path.join(root, "data", "admin-content.json");

const GLOBAL = { price: "$49.00", oldPrice: "$79.00", basePrice: "$39.00" };
const REGIONAL = [
  { countryCode: "IN", price: "₹4,199", oldPrice: "₹6,699", basePrice: "₹3,299" },
  { countryCode: "US", price: "$49.00", oldPrice: "$79.00", basePrice: "$39.00" },
  { countryCode: "AE", price: "AED 179.00", oldPrice: "AED 289.00", basePrice: "AED 139.00" },
  { countryCode: "GB", price: "£39.00", oldPrice: "£59.00", basePrice: "£29.00" },
  { countryCode: "AU", price: "A$79.00", oldPrice: "A$129.00", basePrice: "A$59.00" },
];

const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const courses = Array.isArray(json.managedCourses) ? json.managedCourses : [];
for (const course of courses) {
  course.price = GLOBAL.price;
  course.oldPrice = GLOBAL.oldPrice;
  course.basePrice = GLOBAL.basePrice;
  course.regionalPrices = REGIONAL.map((row) => ({ ...row }));
}
fs.copyFileSync(jsonPath, `${jsonPath}.pre-standard-pricing`);
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
console.log(`Updated pricing on ${courses.length} courses in ${jsonPath}`);
console.log("Default:", GLOBAL.price, "/", GLOBAL.oldPrice, "/", GLOBAL.basePrice);
console.log("Countries:", REGIONAL.map((r) => r.countryCode).join(", "));
