#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Проверяем папку для логотипов
const publicDir = path.join(process.cwd(), 'public');
const logosDir = path.join(publicDir, 'generated-logos');

console.log('Проверка папок для логотипов...');
console.log('Current directory:', process.cwd());
console.log('Public directory:', publicDir);
console.log('Logos directory:', logosDir);

// Проверяем существование папки public
if (!fs.existsSync(publicDir)) {
  console.error('❌ Папка public не существует!');
  process.exit(1);
} else {
  console.log('✅ Папка public существует');
}

// Проверяем папку generated-logos
if (!fs.existsSync(logosDir)) {
  console.log('⚠️  Папка generated-logos не существует, создаем...');
  try {
    fs.mkdirSync(logosDir, { recursive: true });
    console.log('✅ Папка generated-logos создана');
  } catch (error) {
    console.error('❌ Ошибка создания папки:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Папка generated-logos существует');
}

// Проверяем права на запись
try {
  const testFile = path.join(logosDir, 'test.txt');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ Права на запись в папку generated-logos есть');
} catch (error) {
  console.error('❌ Нет прав на запись в папку generated-logos:', error.message);
  process.exit(1);
}

// Список файлов в папке
const files = fs.readdirSync(logosDir);
console.log(`📁 Файлов в generated-logos: ${files.length}`);
if (files.length > 0) {
  console.log('Последние 5 файлов:');
  files.slice(-5).forEach(file => {
    const filePath = path.join(logosDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  - ${file} (${Math.round(stats.size / 1024)}KB, ${stats.mtime.toISOString()})`);
  });
}

console.log('✅ Проверка завершена успешно');