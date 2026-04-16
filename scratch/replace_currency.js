const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('₱')) {
                // Change ₱{val} to {val} lei
                content = content.replace(/₱\{/g, '{');
                content = content.replace(/₱/g, ''); // Remove remaining ₱
                
                // Add " lei" after common patterns
                // Pattern: {order.total.toFixed(2)} -> {order.total.toFixed(2)} lei
                content = content.replace(/(\{[^}]+\})\s*(?!\s*lei)/g, '$1 lei');
                // Pattern: matches literal 10 -> 10 lei
                // This might be too aggressive, let's be more specific.
                
                fs.writeFileSync(fullPath, content);
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

replaceInDir('./src');
