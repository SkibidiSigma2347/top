const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const OUTPUT_DIR = path.join(__dirname, '..', 'dist');
const TEMPLATE_PATH = path.join(__dirname, '..', 'template.html');

// Создаём выходную папку
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Рекурсивно читаем папку docs
function readDocsDir(dir, basePath = '') {
    const categories = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach(item => {
        if (item.name.startsWith('.')) return;

        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
            const category = {
                id: item.name,
                title: item.name.charAt(0).toUpperCase() + item.name.slice(1).replace(/-/g, ' '),
                pages: []
            };

            const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.md'));
            files.forEach(file => {
                const filePath = path.join(fullPath, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const { data, content: markdown } = matter(content);
                
                // Извлекаем первый заголовок
                const titleMatch = markdown.match(/^#\s+(.+)$/m);
                const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

                // Конвертируем Markdown в HTML
                const htmlContent = marked(markdown);

                // Извлекаем заголовки для TOC
                const toc = [];
                const headingRegex = /^(#{2,3})\s+(.+)$/gm;
                let match;
                while ((match = headingRegex.exec(markdown)) !== null) {
                    const level = match[1].length;
                    const text = match[2];
                    const id = text.toLowerCase().replace(/[^\wа-яё]/gi, '-').replace(/-+/g, '-');
                    toc.push({ id, text, level });
                }

                category.pages.push({
                    id: `${item.name}-${file.replace('.md', '')}`,
                    title,
                    category: category.id,
                    content: htmlContent,
                    toc
                });
            });

            if (category.pages.length > 0) {
                categories.push(category);
            }
        }
    });

    return categories;
}

// Генерируем сайт
function build() {
    console.log('🔨 Начинаю сборку сайта...');

    const categories = readDocsDir(DOCS_DIR);
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    // Создаём объект с данными
    const siteData = { categories };
    
    // Сериализуем данные в JSON
    const siteDataJSON = JSON.stringify(siteData, null, 2);
    
    // Заменяем плейсхолдер в шаблоне
    let html = template.replace('/* SITE_DATA */', siteDataJSON);

    // Сохраняем результат
    const outputPath = path.join(OUTPUT_DIR, 'index.html');
    fs.writeFileSync(outputPath, html);

    console.log(`✅ Сайт собран! Категорий: ${categories.length}, Страниц: ${categories.reduce((sum, cat) => sum + cat.pages.length, 0)}`);
    console.log(` Выход: ${outputPath}`);
}

build();
