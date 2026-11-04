import fs from 'fs';
import path from 'path';
import ValidationClient, { CategoryData } from '../../components/ValidationClient';
import { getDataDir } from '../../utils/dataPath';

function loadCategoryData(): Record<string, CategoryData> {
  const activeDir = getDataDir();

  const fileMap: Record<string, string> = {
    category1: 'category1_protein_powders.json',
    category2: 'category2_weight_management.json',
    category3: 'category3_supplement_tablets_capsules.json',
    category4: 'category4_gummies.json',
    category5: 'category5_traditional_herbs.json',
    scenario1: 'scenario1_book_of_knowledge.json',
    scenario2: 'scenario2_book_of_knowledge.json',
  };

  const result: Record<string, CategoryData> = {};

  for (const [key, filename] of Object.entries(fileMap)) {
    const fullPath = path.join(activeDir, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        result[key] = JSON.parse(raw);
      } catch (e) {
        console.error(`Failed to parse ${filename}:`, e);
      }
    }
  }

  return result;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ValidationPage() {
  const categories = loadCategoryData();
  return <ValidationClient categories={categories} />;
}
