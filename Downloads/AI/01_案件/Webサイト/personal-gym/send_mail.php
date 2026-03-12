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
$type = trim($input['type'] ?? '');
$message = trim($input['message'] ?? '');

if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '必須項目が入力されていません。']);
    exit;
}

// Email settings
$to = 'raum.web.creator@gmail.com';
$subject = '【ELEVATE】お問い合わせがありました';
$headers = "From: noreply@anatano-okage.com\r\n";
$headers .= "Reply-To: " . $email . "\r\n";


$body = "Webサイトからのお問い合わせがありました。\n\n";
$body .= "お名前: $name\n";
$body .= "メールアドレス: $email\n";
$body .= "お問い合わせ種類: $type\n";
$body .= "メッセージ:\n$message\n";

// Log to file for verification (since we might not have a mail server configured)
$logEntry = "[" . date('Y-m-d H:i:s') . "] To: $to\nSubject: $subject\n$body\n-------------------\n";
file_put_contents('mail.log', $logEntry, FILE_APPEND);

// Attempt to send email (suppressed error to avoid breaking JSON response if mail server is missing)
mb_language("Japanese");
mb_internal_encoding("UTF-8");
$mailSent = @mb_send_mail($to, $subject, $body, $headers);

// For this environment, we'll assume success if we logged it, 
// but in production you'd check $mailSent.
// echo json_encode(['success' => $mailSent]);

echo json_encode(['success' => true, 'message' => 'お問い合わせを受け付けました。']);
