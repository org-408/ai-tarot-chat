sequenceDiagram
participant App
participant Lifecycle
participant Auth
participant Master
participant Usage
participant Server

    Note over App,Server: 🚀 アプリ起動

    App->>Lifecycle: init()
    activate Lifecycle

    Lifecycle->>Auth: init()
    activate Auth

    Note over Auth: ストレージから<br/>トークン確認

    alt トークンなし
        Auth->>Server: デバイス登録
        Server-->>Auth: 新規トークン
    else トークンあり
        Auth->>Auth: トークンデコード
        Auth->>Auth: 有効期限チェック
        alt 期限切れ
            Auth->>Server: トークン更新
            Server-->>Auth: 新しいトークン
        end
    end

    Auth->>Auth: isReady = true
    deactivate Auth

    Lifecycle->>Lifecycle: isInitialized = true
    deactivate Lifecycle

    Note over App: lifecycle完了を検知

    Note over App,Server: 📊 データ取得開始

    App->>Master: useMaster(enabled: true)
    activate Master
    Note over Master: enabled条件:<br/>isInitialized && authIsReady
    Master->>Server: GET /api/masters
    Server-->>Master: マスターデータ
    deactivate Master

    App->>Usage: useUsage(enabled: true)
    activate Usage
    Note over Usage: enabled条件:<br/>isInitialized && authIsReady && clientId
    Usage->>Server: GET /api/clients/usage
    Server-->>Usage: 利用状況
    deactivate Usage

    Note over App: 全データ取得完了
    App->>App: スプラッシュ非表示
    App->>App: メイン画面表示
