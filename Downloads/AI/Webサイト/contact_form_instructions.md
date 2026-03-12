# お問い合わせフォーム実装ガイド（エックスサーバー対応版）

今後のWebサイト制作で、メールフォームを実装する際は、このファイルの内容を指示として使用してください。

## 1. PHPファイル (`send_mail.php`)
以下のコードを使用することで、文字化けを防ぎ、エックスサーバー等でも確実に送信できます。
**変更点:**
- 送信先メールアドレス (`$to`)
- 送信元アドレス (`From`) ※サーバーのドメインに合わせる

```php
<?php
// Set content type to JSON
header('Content-Type: application/json; charset=utf-8');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
    exit;
}

// Validate inputs
$name = trim($input['name'] ?? '');
$email = trim($input['email'] ?? '');
// $type = trim($input['type'] ?? ''); // 必要に応じて追加
$message = trim($input['message'] ?? '');

if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '必須項目が入力されていません。']);
    exit;
}

// --- 設定エリア ---
$to = 'raum.web.creator@gmail.com'; // ★受信したいメールアドレス
$domain = 'anatano-okage.com'; // ★サーバーのドメイン
// ----------------

$subject = '【Webサイト】お問い合わせがありました';
$headers = "From: noreply@{$domain}\r\n";
$headers .= "Reply-To: " . $email . "\r\n";

$body = "Webサイトからのお問い合わせがありました。\n\n";
$body .= "お名前: $name\n";
$body .= "メールアドレス: $email\n";
$body .= "メッセージ:\n$message\n";

// 文字化け対策設定
mb_language("Japanese");
mb_internal_encoding("UTF-8");

// 送信実行
$mailSent = @mb_send_mail($to, $subject, $body, $headers);

if ($mailSent) {
    echo json_encode(['success' => true, 'message' => 'お問い合わせを受け付けました。']);
} else {
    // 失敗時はログに残す（ローカル環境用など）
    $logEntry = "[" . date('Y-m-d H:i:s') . "] Failed to send to $to\n";
    file_put_contents('mail_error.log', $logEntry, FILE_APPEND);
    
    // エラーを返すが、ユーザーには成功したように見せる場合もある
    echo json_encode(['success' => false, 'message' => '送信に失敗しました。']);
}
?>
```

## 2. JavaScript (`script.js`)
フォーム送信時の処理です。

```javascript
const contactForm = document.querySelector('.contact__form'); // フォームのクラス名に合わせる
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        
        // ローディング表示
        submitBtn.disabled = true;
        submitBtn.textContent = '送信中...';

        // データの取得
        const formData = {
            name: this.querySelector('#name').value,
            email: this.querySelector('#email').value,
            message: this.querySelector('#message') ? this.querySelector('#message').value : ''
            // 必要に応じて項目を追加
        };

        fetch('send_mail.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('お問い合わせを受け付けました。');
                contactForm.reset();
            } else {
                alert('送信に失敗しました: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('エラーが発生しました。');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        });
    });
}
```

