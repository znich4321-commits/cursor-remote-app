// UI language. The app is written in Chinese; in English or Russian mode visible UI text is swapped through this table.
// Chat content, file previews and window/model/chat names are left alone (see SKIP).
const I18N = (() => {
  const saved = localStorage.getItem('cr-lang');
  const nav = navigator.language || '';
  const lang = saved === 'zh' || saved === 'en' || saved === 'ru'
    ? saved
    : /^ru\b/i.test(nav) ? 'ru' : /^zh\b/i.test(nav) ? 'zh' : 'ru';

  const EN = {
    '连接中…': 'Connecting…', '列表': 'Chats', '对话': 'Chat', '画面': 'Screen', '↑ 加载更早的消息': '↑ Load earlier messages',
    '切换 ▾': 'Switch ▾', '新建对话': 'New chat', '搜索对话…': 'Search chats…', '清除': 'Clear',
    '暂无对话列表': 'No chats found', '没有匹配的对话': 'No matching chats',
    '在 Cursor 中展开侧边对话列表': 'Expand Agent sidebar in Cursor',
    '在 Cursor 中展开完整侧边对话列表': 'Expand full Agent sidebar in Cursor',
    '加载更多…': 'Load more…', '运行中': 'Running', '未读': 'Unread', '已归档': 'Archived', '已完成': 'Completed',
    '置顶': 'Pin', '取消置顶': 'Unpin', '归档': 'Archive', '恢复': 'Restore',
    '已切换置顶': 'Toggled pin', '已归档对话': 'Chat archived', '已恢复对话': 'Chat restored',
    '正在加载更多对话…': 'Loading more chats…', '正在展开对话列表…': 'Expanding chat list…',
    '没找到聊天面板。': 'No chat panel found.', '请在 Cursor 里打开 Agent 对话，或切到「画面」查看。': 'Open an Agent chat in Cursor, or switch to "Screen".',
    '↓ 最新': '↓ Latest', '聊天面板': 'Chat panel', '整个窗口': 'Whole window', '点击': 'Tap', '滚动': 'Scroll', '刷新': 'Refresh',
    '回车': 'Enter', '⌘回车': '⌘Enter', '打开聊天': 'Open chat', '右键': 'Right-click', '历史': 'Chats', '＋ 新建': '+ New',
    '发给 Cursor Agent…': 'Message Cursor Agent…', '发送': 'Send', '换行': 'Wrap', '在 App 中打开': 'Open in app', '重试': 'Retry',
    '未连接': 'Not connected', '已连接': 'Connected', '断开，重连中…': 'Disconnected, reconnecting…', '已发送': 'Sent',
    '电脑端还没有发布地址（或还在用旧版本），请在电脑上重启服务': 'The computer has not published its address yet (or runs an old version). Restart the service on the computer.',
    '配对信息已失效（电脑端重置过），请重新配对': 'Pairing is no longer valid (the computer was reset). Please pair again.',
    '这台设备还没有配对。': 'This device is not paired yet.',
    '在电脑上运行 npm run pair，用手机扫码；或者把链接复制过来粘贴到下面。': 'Run npm run pair on the computer and scan the code, or paste the pairing link below.',
    '粘贴配对链接': 'Paste pairing link', '配对': 'Pair', '验证': 'Verify', '这不是配对链接（应包含 #pair=…）': 'That is not a pairing link (it should contain #pair=…)',
    '请输入 Authenticator 里「Cursor Remote」的 6 位验证码': 'Enter the 6-digit "Cursor Remote" code from your Authenticator app',
    '正在配对…': 'Pairing…', '连不上电脑，配对链接 10 分钟内有效，稍后重试': 'Cannot reach the computer. The pairing link is valid for 10 minutes; try again shortly.',
    '配对失败': 'Pairing failed', '这台设备之前已经配对过，可以继续使用。': 'This device was paired before and can keep using it.', '继续使用': 'Continue',
    '正在验证…': 'Verifying…', '验证失败': 'Verification failed', '连不上电脑': 'Cannot reach the computer',
    '已收到配对链接。': 'Pairing link received.', '装了安卓 App 就在 App 里打开；否则直接在浏览器里用。': 'Open it in the Android app if installed; otherwise use it in the browser.',
    '在浏览器里继续': 'Continue in browser', '正在查找电脑…': 'Looking for the computer…', '读取失败，请检查手机网络（需要能打开 github.io）': 'Could not load. Check your phone\'s network (github.io must be reachable).',
    '还没有找到电脑地址。': 'The computer\'s address isn\'t published yet.', '请在电脑上运行 npm run public 并保持窗口开着，约 1 分钟后点重试。': 'Run npm run public on the computer and keep that window open, then tap Retry in about a minute.',
    '电脑不在线：可能关机、睡眠，或服务刚重启（新地址约 1 分钟后生效）。会自动重试…': 'Computer offline: it may be off, asleep, or the service just restarted (a new address takes about a minute). Retrying automatically…',
    '这台设备已被移除，请重新配对': 'This device was removed. Please pair again.',
    '切换 Cursor 窗口': 'Switch Cursor window', '没有找到窗口': 'No windows found', '本地': 'Local',
    '「Agents」是 Cursor 专门跑 Agent 的窗口；其他是普通编辑器窗口（IDE 模式），SSH 远程窗口也在这里。': '"Agents" is Cursor\'s dedicated Agent window; the others are regular editor windows (IDE mode), including SSH remotes.',
    '选择模式': 'Mode', '选择模型': 'Model', '历史对话': 'Chat history', '菜单是空的，可能 Cursor 版本不同': 'The menu is empty; your Cursor version may differ',
    '更大上下文、更贵': 'Larger context, costs more', '参数': 'Params', '模型': 'Model', '改动会直接应用到电脑上 Cursor 的这个模型。': 'Changes apply directly to this model in Cursor on your computer.',
    '：开': ': on', '：关': ': off',
    '已配对设备': 'Paired devices', '移除': 'Remove', '添加新设备：在电脑上运行 npm run pair。': 'Add a device: run npm run pair on the computer.',
    '开启 Authenticator 二次验证：npm run 2fa。': 'Turn on Authenticator 2FA: npm run 2fa.',
    '赞赏作者 ☕': 'Support the author ☕', '觉得好用的话，可以请作者喝杯咖啡。完全自愿，感谢支持！': 'If you find it useful, you can buy the author a coffee. Entirely optional — thank you!',
    '海外': 'Intl', '手机上可以长按二维码保存，再用微信 / 支付宝「扫一扫」从相册识别。': 'Long-press a QR code to save it, then scan it from your photos in WeChat / Alipay.',
    '通知：已开启': 'Notifications: on', 'Agent 完成或等你确认时提醒': 'Alerts when the Agent finishes or needs your OK', '关闭': 'Turn off',
    '发一条测试通知': 'Send a test notification', '开启通知': 'Turn on notifications', '新': 'New', '菜单': 'Menu',
    '更换 App 地址': 'Change app address', '安装到手机桌面（像 App 一样打开）': 'Add to home screen (opens like an app)', '重新连接': 'Reconnect',
    '取消本机配对': 'Unpair this device', '检查更新失败，请稍后再试': 'Update check failed; try again later', '已经是最新版本': 'You are on the latest version',
    '正在下载新版本，下载完会弹出安装界面': 'Downloading the new version; the installer opens when it is done',
    '通知组件没有加载，请刷新后再试': 'Notifications did not load; refresh and try again',
    '通知已开启。华为等手机请在「设置 → 应用启动管理」里允许本 App 后台活动': 'Notifications are on. On Huawei and similar phones, allow background activity in Settings → App launch.',
    '请先在菜单里更新安卓 App，新版才支持通知': 'Update the Android app from the menu first; notifications need the new version',
    'iPhone 要先「分享 → 添加到主屏幕」，从桌面图标打开后才能开启通知': 'On iPhone, first use Share → Add to Home Screen, then open from the home-screen icon to enable notifications',
    '这个浏览器不支持通知': 'This browser does not support notifications', '没有通知权限，请在系统设置里允许本 App 发通知': 'No notification permission; allow it in system settings',
    '注册失败': 'Registration failed', '通知已开启': 'Notifications are on', '通知已关闭': 'Notifications are off',
    '安装到桌面': 'Add to home screen', '用 Safari 打开本页 → 点底部「分享」按钮 → 选「添加到主屏幕」。': 'Open this page in Safari → tap Share at the bottom → choose "Add to Home Screen".',
    '安装后从桌面图标打开，就是全屏 App。': 'Open it from the home-screen icon for a full-screen app.',
    '安装安卓 App': 'Install the Android app', '下载安卓 App（推荐）': 'Download the Android app (recommended)',
    '华为等没有谷歌服务的手机、任何浏览器都能装。下载后点开安装（如提示「未知来源」，允许即可）。': 'Works on phones without Google services (e.g. Huawei) and from any browser. Open the download to install (allow "unknown sources" if asked).',
    '首次打开填入这个地址：': 'On first launch, enter this address:', '复制': 'Copy', '或者：用浏览器安装（需要谷歌服务）': 'Or: install via the browser (needs Google services)',
    '切换中…': 'Switching…', '切换 MAX Mode…': 'Toggling MAX Mode…', '读取模型参数…': 'Loading model parameters…', '设置中…': 'Applying…',
    '已复制地址': 'Address copied', '复制失败，请手动记下地址': 'Copy failed; note the address manually',
    '已发送测试通知，几秒内应该收到': 'Test notification sent; it should arrive within seconds', '发送失败': 'Send failed',
    '取消本机配对？之后要在电脑上重新运行 npm run pair 才能再用。': 'Unpair this device? You will need to run npm run pair on the computer again to use it.',
    '正在查看子 Agent 的对话（只读）': 'Viewing a subagent\'s chat (read-only)', '返回主对话': 'Back to main chat',
    '查看': 'View', '停止': 'Stop', '修改': 'Edit', '立即发送': 'Send now', '删除': 'Delete', '打断当前这一轮，立刻发送': 'Interrupt the current turn and send right away',
    'Agent 正在运行，下面的消息会在这一轮结束后依次发送': 'Agent is running; the messages below are sent in order when this turn ends',
    'Agent 正在运行，现在发的消息会先排队': 'Agent is running; new messages will be queued',
    '(空)': '(empty)', '这条排队消息已经不在了': 'That queued message is gone', '修改排队消息': 'Edit queued message', '保存（仍在排队）': 'Save (stays queued)',
    '内容不能为空；不想要这条就点「删除」': 'The message cannot be empty; use "Delete" to drop it', '正在修改排队消息…': 'Updating queued message…',
    '已停止 Agent': 'Agent stopped', '返回主对话…': 'Returning to main chat…', '已停止子 Agent': 'Subagent stopped', '正在打开子 Agent…': 'Opening subagent…',
    '已立即发送这条排队消息': 'Queued message sent now', '已删除这条排队消息': 'Queued message deleted',
    '读取模式列表…': 'Loading modes…', '读取模型列表…': 'Loading models…', '读取历史对话…': 'Loading chat history…', '已新建对话': 'New chat started',
    '正在从电脑读取…': 'Reading from the computer…', '可以切到「画面」在 Cursor 里打开': 'You can open it in Cursor from the "Screen" tab',
    '文件太长，只显示了前 512 KB': 'File too long; showing the first 512 KB',
    '语言 / Language': '语言 / Language', '请说话…（再点一下结束）': 'Listening… (tap again to stop)', '请说话…': 'Listening…',
    '没听清，再试一次': 'Didn\'t catch that, try again', '没有麦克风权限': 'No microphone permission',
    '语音识别连不上服务器（国内网络常见），可以用输入法键盘上的麦克风': 'Speech recognition cannot reach its server; use the microphone on your keyboard instead',
    '这个浏览器不支持语音识别，可以用输入法键盘上的麦克风': 'This browser has no speech recognition; use the microphone on your keyboard instead',
    '更新安卓 App 后可用语音输入，也可以用输入法键盘上的麦克风': 'Update the Android app for voice input, or use the microphone on your keyboard',
    '手机上没有语音识别服务，可以用输入法键盘上的麦克风': 'No speech recognition service on this phone; use the microphone on your keyboard instead',
    '语音输入': 'Voice input', '语音按钮': 'Voice button', '输入法键盘自带麦克风的话用不着': 'Not needed if your keyboard has a mic',
    '取消': 'Cancel', '确定': 'OK', '取消配对': 'Unpair',
    '停止 Agent？': 'Stop the Agent?', '它这一轮正在做的事会中断。': 'Whatever it is doing in this turn will be interrupted.',
    '它做到一半的工作会中断。': 'Its unfinished work will be interrupted.',
    '立即发送这条消息？': 'Send this message now?', 'Agent 当前这一轮会被打断。': 'The Agent\'s current turn will be interrupted.',
    '删除这条排队消息？': 'Delete this queued message?',
    '附加图片': 'Attach image', '正在处理图片…': 'Processing image…', '读不了这张图片，换一张试试': "Couldn't read that image; try another",
    '图片已附加到 Cursor 输入框，写好文字后点发送': 'Image attached in Cursor; type your message and tap Send',
    '只支持 PNG / JPEG / GIF / WebP 图片': 'Only PNG / JPEG / GIF / WebP images are supported',
    'Cursor 没有接收这张图片（当前模型可能不支持图片）': "Cursor didn't accept the image (the current model may not support images)",
    '❓ Agent 在问你': '❓ The Agent is asking you', '其他…': 'Other…', '填入': 'Set', '跳过': 'Skip', '提交': 'Submit', '已跳过': 'Skipped', '已提交': 'Submitted',
    '这个问题已经不在了（可能已在电脑上回答）': 'That question is gone (maybe it was answered on the computer)',
    '保留': 'Keep', '撤销': 'Undo', '读取改动的文件…': 'Loading changed files…', '没有待处理的改动': 'No pending changes',
    '正在撤销…': 'Undoing…', '正在保留…': 'Keeping…', '处理中…': 'Working…',
    '点文件名查看内容。「保留」接受这个文件的改动，「撤销」把它恢复成改动前的样子。': 'Tap a file name to view it. "Keep" accepts the change to that file; "Undo" restores it to how it was before.',
    '文件会恢复成 Agent 改之前的样子。': 'The file goes back to how it was before the Agent changed it.',
    '不支持的操作': 'Unsupported action', '文件列表已经变了，请重新打开': 'The file list changed; open it again',
    '没找到这个按钮（可能 Cursor 版本不同）': 'Button not found (your Cursor version may differ)',
    '已修改，仍在排队': 'Updated, still queued', 'Agent 正在运行，已加入排队，这一轮结束后自动发送': 'Agent is running; queued, and it sends automatically when this turn ends',
    '按钮已经不在了，可能状态已变化': 'That button is gone; the state may have changed', 'Cursor 没有进入编辑状态，没改动': 'Cursor did not enter edit mode; nothing changed',
    '不支持的排队操作': 'Unsupported queue action', '这条排队消息已经不在了（可能刚被发出）': 'That queued message is gone (it may have just been sent)',
    '没找到排队消息的操作按钮（可能 Cursor 版本不同）': 'Could not find the queue buttons (your Cursor version may differ)',
    '这个子 Agent 已经结束了，或者 Cursor 里找不到它': 'That subagent has finished, or Cursor cannot find it',
    '找不到原来的主对话标签页，请在「画面」里手动切回': 'Cannot find the main chat tab; switch back manually in "Screen"',
    'Agent 当前没有在运行': 'The Agent is not running', '当前窗口里没有这个按钮（可能是 Cursor 版本或布局不同）': 'This window has no such button (your Cursor version or layout may differ)',
    '这个 Cursor 版本没有 MAX Mode 开关': 'This Cursor version has no MAX Mode toggle', '模型列表里找不到这个模型': 'That model is not in the list',
    '这个模型没有可调的参数': 'This model has no adjustable parameters', '参数菜单没有打开（可能 Cursor 版本不同）': 'The parameter menu did not open (your Cursor version may differ)',
    '不是文件路径': 'Not a file path', '二进制文件，不能预览': 'Binary file; cannot preview',
    '没有找到 Cursor 窗口，确认 Cursor 是以 --remote-debugging-port=9222 启动的': 'No Cursor window found; make sure Cursor was started with --remote-debugging-port=9222',
    'Cursor 窗口连接已断开': 'Lost connection to the Cursor window',
    '没找到可见的聊天输入框：先在画面里打开 Agent 面板（或点「打开聊天」）': 'No visible chat input: open the Agent panel in "Screen" first (or tap "Open chat")',
    '尚未连接到 Cursor 窗口': 'Not connected to a Cursor window yet',
    '连不上 Cursor：Cursor 没有用 start-cursor.sh 启动（调试端口未开启）': 'Cannot reach Cursor: it was not started with start-cursor.sh (debug port is off)',
    '尝试次数过多，请 15 分钟后再试': 'Too many attempts; try again in 15 minutes',
    '配对链接无效或已过期（10 分钟内有效，只能用一次）。请在电脑上重新运行 npm run pair': 'The pairing link is invalid or expired (valid 10 minutes, single use). Run npm run pair on the computer again.',
    '验证码不对': 'Wrong code', '设备未配对': 'Device not paired', '需要二次验证': 'Two-factor verification required', '订阅信息无效': 'Invalid subscription',
  };

  const RU = {
    '连接中…': 'Подключение…', '列表': 'Чаты', '对话': 'Чат', '画面': 'Экран', '↑ 加载更早的消息': '↑ Загрузить ранние сообщения',
    '切换 ▾': 'Чаты ▾', '新建对话': 'Новый чат', '搜索对话…': 'Поиск по чатам…', '清除': 'Очистить',
    '暂无对话列表': 'Список чатов пуст', '没有匹配的对话': 'Ничего не найдено',
    '在 Cursor 中展开侧边对话列表': 'Открыть боковую панель чатов в Cursor',
    '在 Cursor 中展开完整侧边对话列表': 'Открыть полный список чатов в Cursor',
    '加载更多…': 'Показать ещё…', '运行中': 'В работе', '未读': 'Не прочитано', '已归档': 'В архиве', '已完成': 'Завершено',
    '置顶': 'Закрепить', '取消置顶': 'Открепить', '归档': 'В архив', '恢复': 'Восстановить',
    '已切换置顶': 'Закрепление изменено', '已归档对话': 'Чат отправлен в архив', '已恢复对话': 'Чат восстановлен',
    '正在加载更多对话…': 'Загрузка чатов…', '正在展开对话列表…': 'Открытие панели чатов…',
    'Pinned': 'Закреплённые', 'Today': 'Сегодня', 'Yesterday': 'Вчера',
    'Last 7 Days': 'Последние 7 дней', 'Last 30 Days': 'Последние 30 дней',
    'Older': 'Старые', 'Archived': 'Архив', 'Open Tabs': 'Открытые вкладки',
    'Thinking': 'Думает…',
    '没找到聊天面板。': 'Панель чата не найдена.', '请在 Cursor 里打开 Agent 对话，或切到「画面」查看。': 'Откройте чат Agent в Cursor или переключитесь на «Экран».',
    '↓ 最新': '↓ Вниз', '聊天面板': 'Панель чата', '整个窗口': 'Всё окно', '点击': 'Клик', '滚动': 'Прокрутка', '刷新': 'Обновить',
    '回车': 'Enter', '⌘回车': '⌘Enter', '打开聊天': 'Открыть чат', '右键': 'ПКМ', '历史': 'Чаты', '＋ 新建': '+ Новый',
    '发给 Cursor Agent…': 'Сообщение для Cursor Agent…', '发送': 'Отправить', '换行': 'Перенос', '在 App 中打开': 'Открыть в приложении', '重试': 'Повторить',
    '未连接': 'Не подключено', '已连接': 'Подключено', '断开，重连中…': 'Отключено, переподключение…', '已发送': 'Отправлено',
    '电脑端还没有发布地址（或还在用旧版本），请在电脑上重启服务': 'Компьютер ещё не опубликовал адрес (или работает старая версия). Перезапустите сервис на ПК.',
    '配对信息已失效（电脑端重置过），请重新配对': 'Привязка устарела (на ПК был сброс). Привяжите устройство заново.',
    '这台设备还没有配对。': 'Это устройство ещё не привязано.',
    '在电脑上运行 npm run pair，用手机扫码；或者把链接复制过来粘贴到下面。': 'Запустите npm run pair на ПК и отсканируйте QR-код или вставьте ссылку привязки ниже.',
    '粘贴配对链接': 'Вставьте ссылку привязки', '配对': 'Привязать', '验证': 'Проверить', '这不是配对链接（应包含 #pair=…）': 'Это не ссылка привязки (должна содержать #pair=…)',
    '请输入 Authenticator 里「Cursor Remote」的 6 位验证码': 'Введите 6-значный код «Cursor Remote» из приложения Authenticator',
    '正在配对…': 'Привязка…', '连不上电脑，配对链接 10 分钟内有效，稍后重试': 'Нет связи с ПК. Ссылка привязки действует 10 минут, попробуйте чуть позже.',
    '配对失败': 'Ошибка привязки', '这台设备之前已经配对过，可以继续使用。': 'Это устройство уже было привязано ранее, можно продолжить.', '继续使用': 'Продолжить',
    '正在验证…': 'Проверка…', '验证失败': 'Ошибка проверки', '连不上电脑': 'Нет связи с ПК',
    '已收到配对链接。': 'Ссылка привязки получена.', '装了安卓 App 就在 App 里打开；否则直接在浏览器里用。': 'Откройте в Android-приложении, если оно установлено, или продолжайте в браузере.',
    '在浏览器里继续': 'Продолжить в браузере', '正在查找电脑…': 'Поиск компьютера…', '读取失败，请检查手机网络（需要能打开 github.io）': 'Ошибка загрузки. Проверьте сеть телефона (должен открываться github.io).',
    '还没有找到电脑地址。': 'Адрес компьютера ещё не найден.', '请在电脑上运行 npm run public 并保持窗口开着，约 1 分钟后点重试。': 'Запустите npm run public на ПК и не закрывайте окно, затем нажмите «Повторить» через минуту.',
    '电脑不在线：可能关机、睡眠，或服务刚重启（新地址约 1 分钟后生效）。会自动重试…': 'ПК не в сети: возможно, выключен, спит или сервис перезапущен. Повторная попытка автоматически…',
    '这台设备已被移除，请重新配对': 'Это устройство было удалено. Выполните привязку заново.',
    '切换 Cursor 窗口': 'Выбрать окно Cursor', '没有找到窗口': 'Окна не найдены', '本地': 'Локально',
    '「Agents」是 Cursor 专门跑 Agent 的窗口；其他是普通编辑器窗口（IDE 模式），SSH 远程窗口也在这里。': '«Agents» — специальное окно Cursor для агентов; остальные — обычные окна редактора (режим IDE), включая SSH.',
    '选择模式': 'Режим', '选择模型': 'Модель', '历史对话': 'История чатов', '菜单是空的，可能 Cursor 版本不同': 'Меню пустое; возможно, другая версия Cursor',
    '更大上下文、更贵': 'Больше контекст, дороже', '参数': 'Параметры', '模型': 'Модель', '改动会直接应用到电脑上 Cursor 的这个模型。': 'Изменения применяются напрямую к этой модели в Cursor на ПК.',
    '：开': ': вкл', '：关': ': выкл',
    '已配对设备': 'Привязанные устройства', '移除': 'Удалить', '添加新设备：在电脑上运行 npm run pair。': 'Добавить устройство: запустите npm run pair на ПК.',
    '开启 Authenticator 二次验证：npm run 2fa。': 'Включить двухфакторную защиту Authenticator: npm run 2fa.',
    '赞赏作者 ☕': 'Поддержать автора ☕', '觉得好用的话，可以请作者喝杯咖啡。完全自愿，感谢支持！': 'Если приложение полезно, можно угостить автора кофе. Полностью добровольно — спасибо!',
    '海外': 'Междунар.', '手机上可以长按二维码保存，再用微信 / 支付宝「扫一扫」从相册识别。': 'Удерживайте QR-код, чтобы сохранить его, затем отсканируйте из галереи в WeChat / Alipay.',
    '通知：已开启': 'Уведомления: вкл', 'Agent 完成或等你确认时提醒': 'Оповещать, когда Agent завершил работу или ждёт подтверждения', '关闭': 'Выключить',
    '发一条测试通知': 'Отправить тестовое уведомление', '开启通知': 'Включить уведомления', '新': 'Новое', '菜单': 'Меню',
    '更换 App 地址': 'Изменить адрес приложения', '安装到手机桌面（像 App 一样打开）': 'Добавить на главный экран (как приложение)', '重新连接': 'Переподключиться',
    '取消本机配对': 'Отвязать это устройство', '检查更新失败，请稍后再试': 'Не удалось проверить обновления; попробуйте позже', '已经是最新版本': 'Установлена последняя версия',
    '正在下载新版本，下载完会弹出安装界面': 'Скачивание новой версии; после загрузки откроется установка',
    '通知组件没有加载，请刷新后再试': 'Компонент уведомлений не загрузился; обновите страницу',
    '通知已开启。华为等手机请在「设置 → 应用启动管理」里允许本 App 后台活动': 'Уведомления включены. На телефонах Huawei разрешите фоновую работу в Настройках.',
    '请先在菜单里更新安卓 App，新版才支持通知': 'Сначала обновите Android-приложение через меню для поддержки уведомлений',
    'iPhone 要先「分享 → 添加到主屏幕」，从桌面图标打开后才能开启通知': 'На iPhone сначала нажмите «Поделиться → На экран Домой» и откройте приложение с иконки',
    '这个浏览器不支持通知': 'Этот браузер не поддерживает уведомления', '没有通知权限，请在系统设置里允许本 App 发通知': 'Нет разрешения на уведомления; включите их в настройках системы',
    '注册失败': 'Ошибка регистрации', '通知已开启': 'Уведомления включены', '通知已关闭': 'Уведомления выключены',
    '安装到桌面': 'Добавить на главный экран', '用 Safari 打开本页 → 点底部「分享」按钮 → 选「添加到主屏幕」。': 'Откройте страницу в Safari → нажмите «Поделиться» внизу → выберите «На экран Домой».',
    '安装后从桌面图标打开，就是全屏 App。': 'Откройте с иконки на главном экране для полноэкранного режима.',
    '安装安卓 App': 'Установить Android-приложение', '下载安卓 App（推荐）': 'Скачать Android-приложение (рекомендуется)',
    '华为等没有谷歌服务的手机、任何浏览器都能装。下载后点开安装（如提示「未知来源」，允许即可）。': 'Работает на телефонах без сервисов Google и из любого браузера. Откройте скачанный файл для установки.',
    '首次打开填入这个地址：': 'При первом запуске введите этот адрес:', '复制': 'Копировать', '或者：用浏览器安装（需要谷歌服务）': 'Или: установить через браузер (нужны сервисы Google)',
    '切换中…': 'Переключение…', '切换 MAX Mode…': 'Переключение MAX Mode…', '读取模型参数…': 'Загрузка параметров модели…', '设置中…': 'Применение…',
    '已复制地址': 'Адрес скопирован', '复制失败，请手动记下地址': 'Не удалось скопировать; запишите адрес вручную',
    '已发送测试通知，几秒内应该收到': 'Тестовое уведомление отправлено; должно прийти через несколько секунд', '发送失败': 'Ошибка отправки',
    '取消本机配对？之后要在电脑上重新运行 npm run pair 才能再用。': 'Отвязать это устройство? Для повторного входа нужно будет запустить npm run pair на ПК.',
    '正在查看子 Agent 的对话（只读）': 'Просмотр чата субагента (только чтение)', '返回主对话': 'Назад в основной чат',
    '查看': 'Открыть', '停止': 'Стоп', '修改': 'Изменить', '立即发送': 'Отправить сейчас', '删除': 'Удалить', '打断当前这一轮，立刻发送': 'Прервать текущий шаг и отправить сразу',
    'Agent 正在运行，下面的消息会在这一轮结束后依次发送': 'Agent работает; сообщения ниже будут отправлены по очереди после завершения текущего шага',
    'Agent 正在运行，现在发的消息会先排队': 'Agent работает; новые сообщения встанут в очередь',
    '(空)': '(пусто)', '这条排队消息已经不在了': 'Это сообщение из очереди уже исчезло', '修改排队消息': 'Изменить сообщение в очереди', '保存（仍在排队）': 'Сохранить (останется в очереди)',
    '内容不能为空；不想要这条就点「删除」': 'Сообщение не может быть пустым; нажмите «Удалить», чтобы убрать его', '正在修改排队消息…': 'Обновление сообщения в очереди…',
    '已停止 Agent': 'Agent остановлен', '返回主对话…': 'Возврат в основной чат…', '已停止子 Agent': 'Субагент остановлен', '正在打开子 Agent…': 'Открытие субагента…',
    '已立即发送这条排队消息': 'Сообщение из очереди отправлено', '已删除这条排队消息': 'Сообщение из очереди удалено',
    '读取模式列表…': 'Загрузка режимов…', '读取模型列表…': 'Загрузка моделей…', '读取历史对话…': 'Загрузка истории чатов…', '已新建对话': 'Создан новый чат',
    '正在从电脑读取…': 'Чтение с компьютера…', '可以切到「画面」在 Cursor 里打开': 'Можно открыть в Cursor через вкладку «Экран»',
    '文件太长，只显示了前 512 KB': 'Файл слишком большой; показаны первые 512 КБ',
    '语言 / Language': 'Язык / Language', '请说话…（再点一下结束）': 'Говорите… (нажмите ещё раз для завершения)', '请说话…': 'Говорите…',
    '没听清，再试一次': 'Не удалось расслышать, попробуйте ещё раз', '没有麦克风权限': 'Нет доступа к микрофону',
    '语音识别连不上服务器（国内网络常见），可以用输入法键盘上的麦克风': 'Сервис распознавания речи недоступен; используйте микрофон на клавиатуре',
    '这个浏览器不支持语音识别，可以用输入法键盘上的麦克风': 'Браузер не поддерживает распознавание речи; используйте микрофон на клавиатуре',
    '更新安卓 App 后可用语音输入，也可以用输入法键盘上的麦克风': 'Обновите Android-приложение для голосового ввода или используйте микрофон на клавиатуре',
    '手机上没有语音识别服务，可以用输入法键盘上的麦克风': 'На телефоне нет службы распознавания речи; используйте микрофон на клавиатуре',
    '语音输入': 'Голосовой ввод', '语音按钮': 'Кнопка голоса', '输入法键盘自带麦克风的话用不着': 'Не нужна, если на клавиатуре уже есть микрофон',
    '取消': 'Отмена', '确定': 'ОК', '取消配对': 'Отвязать',
    '停止 Agent？': 'Остановить Agent?', '它这一轮正在做的事会中断。': 'Текущее действие агента будет прервано.',
    '它做到一半的工作会中断。': 'Незавершённая работа будет прервана.',
    '立即发送这条消息？': 'Отправить это сообщение сейчас?', 'Agent 当前这一轮会被打断。': 'Текущий шаг Agent будет прерван.',
    '删除这条排队消息？': 'Удалить это сообщение из очереди?',
    '附加图片': 'Прикрепить изображение', '正在处理图片…': 'Обработка изображения…', '读不了这张图片，换一张试试': 'Не удалось прочитать изображение; попробуйте другое',
    '图片已附加到 Cursor 输入框，写好文字后点发送': 'Изображение прикреплено в Cursor; введите текст и нажмите «Отправить»',
    '只支持 PNG / JPEG / GIF / WebP 图片': 'Поддерживаются только изображения PNG / JPEG / GIF / WebP',
    'Cursor 没有接收这张图片（当前模型可能不支持图片）': 'Cursor не принял изображение (возможно, текущая модель не поддерживает картинки)',
    '❓ Agent 在问你': '❓ Agent спрашивает вас', '其他…': 'Другое…', '填入': 'Вставить', '跳过': 'Пропустить', '提交': 'Отправить', '已跳过': 'Пропущено', '已提交': 'Отправлено',
    '这个问题已经不在了（可能已在电脑上回答）': 'Этот вопрос уже закрыт (возможно, на него ответили на ПК)',
    '保留': 'Оставить', '撤销': 'Откатить', '读取改动的文件…': 'Загрузка изменённых файлов…', '没有待处理的改动': 'Нет ожидающих изменений',
    '正在撤销…': 'Откат…', '正在保留…': 'Сохранение…', '处理中…': 'Обработка…',
    '点文件名查看内容。「保留」接受这个文件的改动，「撤销」把它恢复成改动前的样子。': 'Нажмите на имя файла для просмотра. «Оставить» принимает изменения файла; «Откатить» возвращает исходную версию.',
    '文件会恢复成 Agent 改之前的样子。': 'Файл вернётся к состоянию до изменений Agent.',
    '不支持的操作': 'Неподдерживаемое действие', '文件列表已经变了，请重新打开': 'Список файлов изменился; откройте его заново',
    '没找到这个按钮（可能 Cursor 版本不同）': 'Кнопка не найдена (возможно, другая версия Cursor)',
    '已修改，仍在排队': 'Изменено, остаётся в очереди', 'Agent 正在运行，已加入排队，这一轮结束后自动发送': 'Agent работает; сообщение добавлено в очередь и отправится после завершения шага',
    '按钮已经不在了，可能状态已变化': 'Кнопка исчезла; возможно, состояние изменилось', 'Cursor 没有进入编辑状态，没改动': 'Cursor не перешёл в режим редактирования; без изменений',
    '不支持的排队操作': 'Неподдерживаемое действие с очередью', '这条排队消息已经不在了（可能刚被发出）': 'Сообщение из очереди уже исчезло (возможно, только что отправлено)',
    '没找到排队消息的操作按钮（可能 Cursor 版本不同）': 'Не найдены кнопки управления очередью (возможно, другая версия Cursor)',
    '这个子 Agent 已经结束了，或者 Cursor 里找不到它': 'Этот субагент уже завершил работу или не найден в Cursor',
    '找不到原来的主对话标签页，请在「画面」里手动切回': 'Не удалось найти вкладку основного чата; переключитесь вручную через «Экран»',
    'Agent 当前没有在运行': 'Agent сейчас не запущен', '当前窗口里没有这个按钮（可能是 Cursor 版本或布局不同）': 'В этом окне нет такой кнопки (возможно, другая версия или раскладка Cursor)',
    '这个 Cursor 版本没有 MAX Mode 开关': 'В этой версии Cursor нет переключателя MAX Mode', '模型列表里找不到这个模型': 'Эта модель не найдена в списке',
    '这个模型没有可调的参数': 'У этой модели нет настраиваемых параметров', '参数菜单没有打开（可能 Cursor 版本不同）': 'Меню параметров не открылось (возможно, другая версия Cursor)',
    '不是文件路径': 'Не путь к файлу', '二进制文件，不能预览': 'Бинарный файл; предпросмотр недоступен',
    '没有找到 Cursor 窗口，确认 Cursor 是以 --remote-debugging-port=9222 启动的': 'Окно Cursor не найдено; убедитесь, что Cursor запущен с --remote-debugging-port=9222',
    'Cursor 窗口连接已断开': 'Соединение с окном Cursor потеряно',
    '没找到可见的聊天输入框：先在画面里打开 Agent 面板（或点「打开聊天」）': 'Поле ввода чата не найдено: сначала откройте панель Agent на вкладке «Экран» (или нажмите «Открыть чат»)',
    '尚未连接到 Cursor 窗口': 'Ещё нет подключения к окну Cursor',
    '连不上 Cursor：Cursor 没有用 start-cursor.sh 启动（调试端口未开启）': 'Нет связи с Cursor: порт отладки 9222 не открыт',
    '尝试次数过多，请 15 分钟后再试': 'Слишком много попыток; повторите через 15 минут',
    '配对链接无效或已过期（10 分钟内有效，只能用一次）。请在电脑上重新运行 npm run pair': 'Ссылка привязки недействительна или истекла (действует 10 минут, одноразовая). Запустите npm run pair на ПК заново.',
    '验证码不对': 'Неверный код', '设备未配对': 'Устройство не привязано', '需要二次验证': 'Требуется двухфакторная проверка', '订阅信息无效': 'Некорректные данные подписки',
  };

  const PATTERNS_EN = [
    [/^切换对话：(.*)$/, 'Switched to: $1'],
    [/^归档对话「(.+)」？$/, 'Archive chat "$1"?'],
    [/^电脑端地址更新于 (.+)$/, 'Computer address updated $1'],
    [/^配对于 (.+) · 最近使用 (.+)$/, 'Paired $1 · last used $2'],
    [/^更新安卓 App（v(.+) → v(.+)）$/, 'Update the Android app (v$1 → v$2)'],
    [/^检查 App 更新（当前 v(.+)）$/, 'Check for app update (now v$1)'],
    [/^安卓 App 有新版本 v(.+)，点右上角「⋯」更新$/, 'Android app v$1 is available; update from "⋯" at the top right'],
    [/^(.*) 参数$/, '$1 parameters'],
    [/^子 Agent 运行中 (\d+) 个$/, 'Subagents running: $1'],
    [/^排队中 (\d+) 条$/, 'Queued: $1'],
    [/^停止子 Agent「(.+)」？$/, 'Stop subagent "$1"?'],
    [/^❓ Agent 在问你（(\d+) 个问题）$/, '❓ The Agent is asking you ($1 questions)'],
    [/^改动了 1 个文件 ›$/, '1 file changed ›'],
    [/^改动了 (\d+) 个文件 ›$/, '$1 files changed ›'],
    [/^Agent 改动的文件（(\d+)）$/, 'Files changed by the Agent ($1)'],
    [/^撤销「(.+)」的改动？$/, 'Undo the changes to "$1"?'],
    [/^确定要点「(.+)」吗？$/, 'Really tap "$1"?'],
    [/^移除「(.+)」？它会立即断开，要重新配对才能再用。$/, 'Remove "$1"? It disconnects immediately and must be paired again.'],
    [/^开启通知失败：(.*)$/, 'Could not turn on notifications: $1'],
    [/^已点击：(.*)$/, 'Tapped: $1'],
    [/^(.+)：(开|关)$/, (m, a, b) => `${a}: ${b === '开' ? 'on' : 'off'}`],
    [/^没找到选项：(.*)$/, 'Option not found: $1'],
    [/^没找到参数：(.*)$/, 'Parameter not found: $1'],
    [/^找不到文件（可能已被删除或移动）：(.*)$/, 'File not found (it may have been deleted or moved): $1'],
    [/^SSH 连接 (.+) 失败：(.*)$/, 'SSH connection to $1 failed: $2'],
    [/^图片太大（(.+)），请在电脑上看$/, 'Image too large ($1); view it on the computer'],
    [/^未知按键: (.*)$/, 'Unknown key: $1'],
    [/^未知指令: (.*)$/, 'Unknown command: $1'],
    [/^(.*)（(安卓 App|安卓浏览器|Mac 浏览器|浏览器)）$/, (m, a, b) => `${a} (${{ '安卓 App': 'Android app', '安卓浏览器': 'Android browser', 'Mac 浏览器': 'Mac browser', '浏览器': 'browser' }[b]})`],
  ];

  const PATTERNS_RU = [
    [/^切换对话：(.*)$/, 'Переключено на: $1'],
    [/^归档对话「(.+)」？$/, 'Отправить чат «$1» в архив?'],
    [/^(\d+) Files?$/i, '$1 файл(ов)'],
    [/^电脑端地址更新于 (.+)$/, 'Адрес ПК обновлён $1'],
    [/^配对于 (.+) · 最近使用 (.+)$/, 'Привязано $1 · исп. $2'],
    [/^更新安卓 App（v(.+) → v(.+)）$/, 'Обновить Android App (v$1 → v$2)'],
    [/^检查 App 更新（当前 v(.+)）$/, 'Проверить обновления App (сейчас v$1)'],
    [/^安卓 App 有新版本 v(.+)，点右上角「⋯」更新$/, 'Доступна версия Android App v$1; обновите через «⋯» вверху справа'],
    [/^(.*) 参数$/, 'Параметры $1'],
    [/^子 Agent 运行中 (\d+) 个$/, 'Активных субагентов: $1'],
    [/^排队中 (\d+) 条$/, 'В очереди: $1'],
    [/^停止子 Agent「(.+)」？$/, 'Остановить субагента «$1»?'],
    [/^❓ Agent 在问你（(\d+) 个问题）$/, '❓ Agent спрашивает вас (вопросов: $1)'],
    [/^改动了 1 个文件 ›$/, 'Изменён 1 файл ›'],
    [/^改动了 (\d+) 个文件 ›$/, 'Изменено файлов: $1 ›'],
    [/^Agent 改动的文件（(\d+)）$/, 'Изменённые файлы Agent ($1)'],
    [/^撤销「(.+)」的改动？$/, 'Откатить изменения в «$1»?'],
    [/^确定要点「(.+)」吗？$/, 'Точно нажать «$1»?'],
    [/^移除「(.+)」？它会立即断开，要重新配对才能再用。$/, 'Удалить «$1»? Устройство сразу отключится, потребуется повторная привязка.'],
    [/^开启通知失败：(.*)$/, 'Не удалось включить уведомления: $1'],
    [/^已点击：(.*)$/, 'Нажато: $1'],
    [/^(.+)：(开|关)$/, (m, a, b) => `${a}: ${b === '开' ? 'вкл' : 'выкл'}`],
    [/^没找到选项：(.*)$/, 'Опция не найдена: $1'],
    [/^没找到参数：(.*)$/, 'Параметр не найден: $1'],
    [/^找不到文件（可能已被删除或移动）：(.*)$/, 'Файл не найден (возможно, удалён или перемещён): $1'],
    [/^SSH 连接 (.+) 失败：(.*)$/, 'Ошибка подключения SSH к $1: $2'],
    [/^图片太大（(.+)），请在电脑上看$/, 'Изображение слишком большое ($1); откройте на ПК'],
    [/^未知按键: (.*)$/, 'Неизвестная клавиша: $1'],
    [/^未知指令: (.*)$/, 'Неизвестная команда: $1'],
    [/^(.*)（(安卓 App|安卓浏览器|Mac 浏览器|浏览器)）$/, (m, a, b) => `${a} (${{ '安卓 App': 'Android App', '安卓浏览器': 'браузер Android', 'Mac 浏览器': 'браузер Mac', '浏览器': 'браузер' }[b]})`],
  ];

  const DICT = lang === 'ru' ? RU : EN;
  const PATTERNS = lang === 'ru' ? PATTERNS_RU : PATTERNS_EN;

  const line = s => {
    const key = s.trim();
    if (!key) return s;
    let out = DICT[key];
    if (out == null && (/[\u4e00-\u9fa5（）「」：]/.test(key) || lang === 'ru')) {
      for (const [re, to] of PATTERNS) if (re.test(key)) { out = key.replace(re, to); break; }
    }
    if (out == null) return s;
    return s.replace(key, out);
  };
  const tr = s => lang === 'zh' || s == null ? s : String(s).split('\n').map(line).join('\n');

  // Content mirrored from Cursor or the computer's files is never translated.
  const SKIP = '#items, #vBody, #vName, #vPath, #titleText, #curChatName, .chatTitle, .qt, [data-label] .lbl, [data-win] .lbl, .qnQ, .qnOpt span';
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const fix = node => {
    if (node.nodeType === 3) {
      if (node.parentElement?.closest(SKIP)) return;
      const t = tr(node.nodeValue);
      if (t !== node.nodeValue) node.nodeValue = t;
      return;
    }
    if (node.nodeType !== 1 || node.closest(SKIP)) return;
    for (const a of ATTRS) if (node.hasAttribute(a)) { const v = node.getAttribute(a), t = tr(v); if (t !== v) node.setAttribute(a, t); }
    for (const c of node.childNodes) fix(c);
  };

  if (lang === 'en' || lang === 'ru') {
    document.documentElement.lang = lang;
    const start = () => {
      fix(document.body);
      new MutationObserver(list => {
        for (const m of list) {
          if (m.type === 'characterData') fix(m.target);
          else if (m.type === 'attributes') fix(m.target);
          else m.addedNodes.forEach(fix);
        }
      }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    const confirm0 = window.confirm.bind(window);
    window.confirm = m => confirm0(tr(m));
  }

  const set = v => { localStorage.setItem('cr-lang', v); location.reload(); };
  return { lang, tr, set, speech: lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'zh-CN' };
})();
