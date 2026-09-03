const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const OUTPUT_DIR = path.join(__dirname, '..', 'dist');
const TEMPLATE_PATH = path.join(__dirname, '..', 'template.html');

// Создаём выходную папку dist, если её нет
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Рекурсивно читаем папку docs
function readDocsDir(dir) {
    const categories = [];
    
    // Если папки docs ещё нет, возвращаем пустой массив
    if (!fs.existsSync(dir)) {
        return categories;
    }

    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach(item => {
        // Игнорируем скрытые файлы и папки
        if (item.name.startsWith('.')) return;

        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
            const category = {
                id: item.name,
                title: item.name.charAt(0).toUpperCase() + item.name.slice(1).replace(/-/g, ' '),
                pages: []
            };

            const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.md'));
            
            // Сортируем файлы по алфавиту
            files.sort();

            files.forEach(file => {
                const filePath = path.join(fullPath, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                
                // Парсим Markdown и front-matter (если есть)
                const { data, content: markdown } = matter(content);
                
                // Извлекаем первый заголовок H1 как название страницы
                const titleMatch = markdown.match(/^#\s+(.+)$/m);
                const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');

                // Конвертируем Markdown в HTML
                const htmlContent = marked(markdown);

                // Извлекаем заголовки H2 и H3 для бокового оглавления (TOC)
                const toc = [];
                const headingRegex = /^(#{2,3})\s+(.+)$/gm;
                let match;
                while ((match = headingRegex.exec(markdown)) !== null) {
                    const level = match[1].length;
                    const text = match[2].trim();
                    // Создаём безопасный ID для якорной ссылки
                    const id = text.toLowerCase()
                        .replace(/[^\wа-яё\s-]/gi, '')
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-');
                    
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

            // Добавляем категорию только если в ней есть страницы
            if (category.pages.length > 0) {
                categories.push(category);
            }
        }
    });

    return categories;
}

// Основная функция сборки
function build() {
    console.log('🔨 Начинаю сборку сайта...');

    const categories = readDocsDir(DOCS_DIR);
    
    if (!fs.existsSync(TEMPLATE_PATH)) {
        console.error('❌ Ошибка: Файл template.html не найден!');
        process.exit(1);
    }

    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

    // Создаём объект с данными для сайта
    const siteDataObj = { categories };
    
    // Сериализуем данные в JSON-строку
    const siteDataJSON = JSON.stringify(siteDataObj, null, 2);
    
    // Заменяем уникальную метку __SITE_DATA__ на реальные данные
    // Это предотвращает синтаксические ошибки вроде "Unexpected token '{'"
    let html = template.replace('__SITE_DATA__', siteDataJSON);

    // Сохраняем результат в папку dist
    const outputPath = path.join(OUTPUT_DIR, 'index.html');
    fs.writeFileSync(outputPath, html);

    const totalPages = categories.reduce((sum, cat) => sum + cat.pages.length, 0);
    console.log(`✅ Сайт успешно собран!`);
    console.log(`   📂 Категорий: ${categories.length}`);
    console.log(`   📄 Страниц: ${totalPages}`);
    console.log(`   📁 Выходной файл: ${outputPath}`);
}

// Запускаем сборку
build();
