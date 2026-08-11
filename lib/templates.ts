export type DiagramTemplate = {
  id: string;
  label: string;
  category: "流程" | "系統" | "規劃" | "資料" | "新圖種";
  docs: string;
  minVersion?: string;
  experimental?: boolean;
  code: string;
};

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: "flowchart",
    label: "流程圖 Flowchart",
    category: "流程",
    docs: "flowchart.html",
    code: `flowchart TD
    A[開始] --> B{判斷條件}
    B -->|是| C[執行處理]
    B -->|否| D[回到確認]
    C --> E[完成]
    D --> B`,
  },
  {
    id: "swimlane",
    label: "泳道圖 Swimlanes",
    category: "新圖種",
    docs: "swimlanes.html",
    minVersion: "11.16.0",
    experimental: true,
    code: `swimlane-beta LR
    subgraph requester[申請人]
      A[提出申請]
      D[補充資料]
    end
    subgraph reviewer[審核者]
      B{資料完整？}
      C[完成審核]
    end
    A --> B
    B -->|否| D
    D --> A
    B -->|是| C`,
  },
  {
    id: "sequence",
    label: "循序圖 Sequence",
    category: "流程",
    docs: "sequenceDiagram.html",
    code: `sequenceDiagram
    actor U as 使用者
    participant S as 系統
    participant A as 審核者
    U->>S: 提交申請
    S->>A: 發送審核通知
    A-->>S: 回覆結果
    S-->>U: 顯示處理狀態`,
  },
  {
    id: "class",
    label: "類別圖 Class",
    category: "系統",
    docs: "classDiagram.html",
    code: `classDiagram
    class Document {
      +String title
      +String status
      +submit()
    }
    class Review {
      +String result
      +approve()
    }
    Document "1" --> "many" Review`,
  },
  {
    id: "state",
    label: "狀態圖 State",
    category: "流程",
    docs: "stateDiagram.html",
    code: `stateDiagram-v2
    [*] --> 草稿
    草稿 --> 審核中: 提交
    審核中 --> 已通過: 核准
    審核中 --> 待補件: 退回
    待補件 --> 審核中: 重送
    已通過 --> [*]`,
  },
  {
    id: "er",
    label: "ER 關聯圖",
    category: "資料",
    docs: "entityRelationshipDiagram.html",
    code: `erDiagram
    USER ||--o{ DOCUMENT : creates
    DOCUMENT ||--o{ REVIEW : contains
    DOCUMENT {
      string title
      string status
    }
    REVIEW {
      string result
      datetime reviewed_at
    }`,
  },
  {
    id: "journey",
    label: "使用者旅程 User Journey",
    category: "規劃",
    docs: "userJourney.html",
    code: `journey
    title 文件申請體驗
    section 準備
      整理資料: 4: 使用者
      填寫申請: 3: 使用者
    section 審核
      系統檢核: 5: 系統
      人工確認: 4: 審核者`,
  },
  {
    id: "gantt",
    label: "甘特圖 Gantt",
    category: "規劃",
    docs: "gantt.html",
    code: `gantt
    title v0.5 建置時程
    dateFormat YYYY-MM-DD
    section 規劃
    需求確認 :done, a1, 2026-08-07, 1d
    section 開發
    核心功能 :active, a2, after a1, 3d
    驗證發布 :a3, after a2, 1d`,
  },
  {
    id: "pie",
    label: "圓餅圖 Pie",
    category: "資料",
    docs: "pie.html",
    code: `pie showData
    title 文件內容比例
    "Markdown" : 55
    "Mermaid" : 30
    "Metadata" : 15`,
  },
  {
    id: "quadrant",
    label: "象限圖 Quadrant",
    category: "資料",
    docs: "quadrantChart.html",
    code: `quadrantChart
    title 功能價值與成本
    x-axis 低成本 --> 高成本
    y-axis 低價值 --> 高價值
    quadrant-1 重大投資
    quadrant-2 優先完成
    quadrant-3 暫緩
    quadrant-4 謹慎評估
    即時預覽: [0.25, 0.90]
    多人協作: [0.80, 0.70]`,
  },
  {
    id: "requirement",
    label: "需求圖 Requirement",
    category: "系統",
    docs: "requirementDiagram.html",
    code: `requirementDiagram
    requirement local_first {
      id: REQ01
      text: Content stays in the local browser
      risk: high
      verifymethod: test
    }
    element browser_storage {
      type: storage
      docref: localStorage
    }
    browser_storage - satisfies -> local_first`,
  },
  {
    id: "gitgraph",
    label: "Git 分支圖 GitGraph",
    category: "系統",
    docs: "gitgraph.html",
    code: `gitGraph
    commit id: "MVP"
    branch feature
    checkout feature
    commit id: "v0.5"
    checkout main
    merge feature
    commit id: "deploy"`,
  },
  {
    id: "c4",
    label: "C4 系統情境圖",
    category: "系統",
    docs: "c4.html",
    experimental: true,
    code: `C4Context
    title Markdown Mermaid Studio
    Person(user, "使用者", "編輯本機文件")
    System(studio, "文件工作台", "編輯、預覽與檢核")
    System_Ext(ai, "外部 AI", "選擇性貼上提示")
    Rel(user, studio, "使用")
    Rel(user, ai, "自行貼上提示")`,
  },
  {
    id: "mindmap",
    label: "心智圖 Mindmap",
    category: "規劃",
    docs: "mindmap.html",
    code: `mindmap
  root((文件工作台))
    編輯
      Markdown
      Mermaid
    檢核
      語法
      結構
    輸出
      MD
      SVG
      PNG`,
  },
  {
    id: "timeline",
    label: "時間軸 Timeline",
    category: "規劃",
    docs: "timeline.html",
    code: `timeline
    title 產品演進
    MVP : 即時預覽 : 本機儲存
    v0.2 : 語法強化 : 錯誤定位
    v0.3 : 文件助手 : 快速修正
    v0.5 : 多文件 : 快照管理 : 雙向定位`,
  },
  {
    id: "sankey",
    label: "桑基圖 Sankey",
    category: "資料",
    docs: "sankey.html",
    experimental: true,
    code: `sankey-beta
Source,Process,80
Process,Complete,60
Process,Returned,20`,
  },
  {
    id: "xychart",
    label: "XY 圖表",
    category: "資料",
    docs: "xyChart.html",
    experimental: true,
    code: `xychart-beta
    title "Weekly completion"
    x-axis [Mon, Tue, Wed, Thu, Fri]
    y-axis "Completion" 0 --> 100
    bar [40, 55, 68, 82, 90]
    line [35, 50, 70, 80, 95]`,
  },
  {
    id: "block",
    label: "區塊圖 Block",
    category: "系統",
    docs: "block.html",
    experimental: true,
    code: `block-beta
    columns 3
    source["Markdown"] --> parser["解析器"] --> preview["即時預覽"]
    source --> storage["本機儲存"]`,
  },
  {
    id: "packet",
    label: "封包圖 Packet",
    category: "資料",
    docs: "packet.html",
    minVersion: "11.0.0",
    experimental: true,
    code: `packet
    0-7: "版本"
    8-15: "類型"
    16-31: "資料長度"`,
  },
  {
    id: "kanban",
    label: "看板 Kanban",
    category: "規劃",
    docs: "kanban.html",
    experimental: true,
    code: `kanban
    todo[待處理]
      task1[補齊測試]
      task2[擴充範本]
    doing[進行中]
      task3[雙向定位]
    done[已完成]
      task4[自動部署]`,
  },
  {
    id: "architecture",
    label: "架構圖 Architecture",
    category: "系統",
    docs: "architecture.html",
    experimental: true,
    code: `architecture-beta
    group app(cloud)[Document Studio]
    service editor(server)[Markdown Editor] in app
    service renderer(server)[Mermaid Renderer] in app
    service storage(database)[Browser Storage] in app
    editor:R --> L:renderer
    editor:B --> T:storage`,
  },
  {
    id: "radar",
    label: "雷達圖 Radar",
    category: "資料",
    docs: "radar.html",
    minVersion: "11.6.0",
    experimental: true,
    code: `radar-beta
    title Document Quality
    axis Structure, Complete, Clear, Traceable, Maintainable
    curve Current{80,70,75,65,72}
    curve Target{95,90,90,88,92}
    max 100`,
  },
  {
    id: "eventmodeling",
    label: "事件模型 Event Modeling",
    category: "新圖種",
    docs: "eventmodeling.html",
    minVersion: "11.15.0",
    experimental: true,
    code: `eventmodeling
    tf 01 ui Editor
    tf 02 cmd SaveDocument
    tf 03 evt DocumentSaved
    tf 04 rmo LivePreview`,
  },
  {
    id: "treemap",
    label: "矩形式樹狀圖 Treemap",
    category: "資料",
    docs: "treemap.html",
    experimental: true,
    code: `treemap-beta
    "文件工作台"
        "Markdown": 55
        "Mermaid": 30
        "工具"
            "搜尋": 8
            "快照": 7`,
  },
  {
    id: "venn",
    label: "文氏圖 Venn",
    category: "資料",
    docs: "venn.html",
    minVersion: "11.12.3",
    experimental: true,
    code: `venn-beta
    set MD["Markdown"]: 30
    set MM["Mermaid"]: 25
    union MD,MM["整合文件"]: 15`,
  },
  {
    id: "ishikawa",
    label: "魚骨圖 Ishikawa",
    category: "規劃",
    docs: "ishikawa.html",
    minVersion: "11.12.3",
    experimental: true,
    code: `ishikawa-beta
    文件品質不足
        人員
            缺少共同規範
        流程
            未執行檢核
        工具
            缺少即時提示`,
  },
  {
    id: "wardley",
    label: "Wardley Map",
    category: "規劃",
    docs: "wardley.html",
    minVersion: "11.14.0",
    experimental: true,
    code: `wardley-beta
    title Document Studio Value Chain
    anchor User [0.95, 0.95]
    component LivePreview [0.75, 0.70]
    component SyntaxParser [0.55, 0.55]
    component BrowserStorage [0.35, 0.85]
    User -> LivePreview
    LivePreview -> SyntaxParser
    SyntaxParser -> BrowserStorage`,
  },
  {
    id: "cynefin",
    label: "Cynefin 框架",
    category: "規劃",
    docs: "cynefin.html",
    minVersion: "11.16.0",
    experimental: true,
    code: `cynefin-beta
    title 需求處理方式
    complex
      "新互動設計"
    complicated
      "效能分析"
    clear
      "格式檢查"
    chaotic
      "正式站故障"
    confusion
      "資訊不足需求"`,
  },
  {
    id: "treeview",
    label: "目錄樹 TreeView",
    category: "新圖種",
    docs: "treeView.html",
    minVersion: "11.14.0",
    experimental: true,
    code: `treeView-beta
    markdown-mermaid-studio/
        app/
            page.tsx
            globals.css
        lib/
            studio.ts
            templates.ts
        README.md`,
  },
];

export function templateMarkdown(template: DiagramTemplate) {
  return `\n\n\`\`\`mermaid\n${template.code}\n\`\`\`\n`;
}

export function templateDocsUrl(template: DiagramTemplate) {
  return `https://mermaid.js.org/syntax/${template.docs}`;
}
