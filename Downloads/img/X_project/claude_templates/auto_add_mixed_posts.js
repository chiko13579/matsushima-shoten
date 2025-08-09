const { addToSpreadsheet } = require('./投稿生成_自動追加システム.js');
const mixedPosts = require('./generate_mixed_posts.js');

console.log('=== ミックス投稿10件を生成・自動追加 ===\n');

// 生成された投稿を表示
console.log('--- 生成された投稿 ---');
mixedPosts.forEach((post, index) => {
    console.log(`\n[${index + 1}] ${post.type}`);
    console.log(post.content);
    console.log('---');
});

console.log(`\n投稿タイプ内訳:`);
const typeCounts = mixedPosts.reduce((acc, post) => {
    acc[post.type] = (acc[post.type] || 0) + 1;
    return acc;
}, {});

Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`- ${type}: ${count}件`);
});

console.log(`\n合計: ${mixedPosts.length}件の投稿を生成しました`);
console.log('スプレッドシートに自動追加中...\n');

// 自動でスプレッドシートに追加
addToSpreadsheet(mixedPosts);