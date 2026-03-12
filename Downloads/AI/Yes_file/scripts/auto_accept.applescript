display dialog "テスト：この画面が見えたら成功です。
自動化を開始しますか？" buttons {"開始", "閉じる"} default button "開始"

if button returned of result is "開始" then
    display notification "開始しました"
    repeat
        tell application "System Events"
            try
                set buttonNames to {"Accept", "Run", "Allow", "Yes", "同意する", "実行", "許可", "はい", "承認"}
                repeat with bName in buttonNames
                    if exists (button bName of every window of (every process whose visible is true)) then
                        click (button bName of every window of (every process whose visible is true))
                    end if
                end repeat
            end try
        end tell
        delay 1
    end repeat
end if
