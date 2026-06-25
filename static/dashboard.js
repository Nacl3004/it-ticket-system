// 全局变量
let currentUser = null;
let token = null;
let ws = null;
let allTickets = [];
let categories = []; // 新增：保存分类数据
let actionModalHandler = null;
let displayedTickets = [];
let currentTicketDetail = null;
let currentAuditType = 'login';
let currentAuditLogs = [];
let allNotifications = [];
let allEngineerStats = [];

const ticketPagination = createClientPagination({
    containerId: 'ticketPagination',
    pageSize: 10,
    onPageChange: () => renderTickets(displayedTickets, false)
});
const auditLogPagination = createClientPagination({
    containerId: 'auditLogPagination',
    pageSize: 10,
    onPageChange: () => renderAuditLogs(currentAuditType, currentAuditLogs, false)
});
const notificationPagination = createClientPagination({
    containerId: 'notificationPagination',
    pageSize: 5,
    onPageChange: () => renderNotifications(allNotifications, false)
});
const engineerStatsPagination = createClientPagination({
    containerId: 'engineerStatsPagination',
    pageSize: 8,
    onPageChange: () => renderEngineerStats(allEngineerStats, false)
});

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 检查登录状态 - 使用sessionStorage，每个标签页独立
    token = sessionStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/static/index.html';
        return;
    }
    
    // 从后端验证token并获取最新用户信息
    try {
        const response = await fetch(`/api/current-user?token=${token}`);
        if (!response.ok) {
            // token无效，清除sessionStorage并跳转到登录页
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.location.href = '/static/index.html';
            return;
        }
        
        const userData = await response.json();
        currentUser = userData;
        
        // 更新sessionStorage中的用户信息
        sessionStorage.setItem('user', JSON.stringify(currentUser));
        
    } catch (error) {
        console.error('获取用户信息失败:', error);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = '/static/index.html';
        return;
    }
    
    // 显示用户信息
    document.getElementById('userName').textContent = currentUser.real_name;
    document.getElementById('userRole').textContent = currentUser.role_name;
    
    // 根据角色显示/隐藏功能
    if (['super_admin', 'admin', 'hr', 'it'].includes(currentUser.role_type)) {
        document.getElementById('userManageBtn').classList.remove('hidden');
        document.getElementById('userManageBtn').addEventListener('click', () => {
            window.location.href = '/static/users.html';
        });
    }
    
    // 绑定"创建工单"按钮
    const createTicketBtn = document.getElementById('createTicketBtn');
    if (createTicketBtn) {
        createTicketBtn.addEventListener('click', showCreateTicketModal);
    }
    
    // 绑定"我的工单"按钮点击事件 - 根据角色显示不同内容
    const myTicketsBtn = document.getElementById('myTicketsBtn');
    if (myTicketsBtn) {
        myTicketsBtn.addEventListener('click', () => {
            // 根据用户角色加载不同的工单
            if (['super_admin', 'admin', 'hr'].includes(currentUser.role_type)) {
                // 管理员和HR可以看到所有工单
                loadTickets();
            } else if (currentUser.role_type === 'it') {
                // IT人员看到分配给自己的工单
                loadMyAssignedTickets();
            } else {
                // 普通用户只看到自己提交的工单
                loadMySubmittedTickets();
            }
        });
    }
    
    // 只有IT、超级管理员、管理员可以看到"待处理工单"按钮
    if (['super_admin', 'admin', 'it'].includes(currentUser.role_type)) {
        const pendingTicketsBtn = document.getElementById('pendingTicketsBtn');
        if (pendingTicketsBtn) {
            pendingTicketsBtn.classList.remove('hidden');
            // 显式绑定点击事件 - 待处理工单是除了已完成、已结单之外的所有状态
            pendingTicketsBtn.addEventListener('click', () => {
                loadPendingTickets();
            });
        }
    }
    
    // 只有超级管理员和管理员可以看到"流程配置"按钮
    if (['super_admin', 'admin'].includes(currentUser.role_type)) {
        const workflowConfigBtn = document.getElementById('workflowConfigBtn');
        if (workflowConfigBtn) {
            workflowConfigBtn.classList.remove('hidden');
            workflowConfigBtn.addEventListener('click', () => {
                window.location.href = '/static/workflow-config.html?v=2026062502';
            });
        }
        const ticketNumberConfigBtn = document.getElementById('ticketNumberConfigBtn');
        if (ticketNumberConfigBtn) {
            ticketNumberConfigBtn.classList.remove('hidden');
            ticketNumberConfigBtn.addEventListener('click', showTicketNumberModal);
        }
        const auditLogBtn = document.getElementById('auditLogBtn');
        if (auditLogBtn) {
            auditLogBtn.classList.remove('hidden');
            auditLogBtn.addEventListener('click', showAuditLogModal);
        }
    }
    
    // 所有用户都可以看到"消息推送"按钮（配置自己的推送）
    const webhookConfigBtn = document.getElementById('webhookConfigBtn');
    if (webhookConfigBtn) {
        webhookConfigBtn.addEventListener('click', () => {
            window.location.href = '/static/webhook-config.html';
        });
    }
    
    // 加载数据
    await loadStatistics();
    await loadCategories();
    await loadEngineers(); // 加载工程师列表
    await loadTickets();
    await loadNotifications();
    
    // 建立WebSocket连接
    connectWebSocket();
    
    // 绑定事件
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('changePasswordBtn').addEventListener('click', showPasswordModal);
    document.getElementById('notificationBtn').addEventListener('click', toggleNotificationDropdown);
    document.getElementById('createTicketForm').addEventListener('submit', createTicket);
    document.getElementById('passwordForm').addEventListener('submit', changePassword);
    document.getElementById('ticketNumberForm').addEventListener('submit', saveTicketNumberSettings);
    ['ticketNoPrefix', 'ticketNoDateFormat', 'ticketNoRandomDigits'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateTicketNumberPreview);
    });
    document.getElementById('actionModalConfirm').addEventListener('click', async () => {
        if (actionModalHandler) {
            await actionModalHandler();
        }
    });
    
    // 点击外部关闭通知下拉菜单
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notificationDropdown');
        const btn = document.getElementById('notificationBtn');
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const styles = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-indigo-600',
        warning: 'bg-yellow-600'
    };
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };

    const toast = document.createElement('div');
    toast.className = `${styles[type] || styles.info} text-white px-5 py-4 rounded-xl shadow-2xl font-semibold flex items-center pointer-events-auto`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info} mr-3"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 260);
    }, 2600);
}

function openActionModal({ title, description = '', body = '', confirmText = '确认', confirmClass = 'bg-indigo-600 hover:bg-indigo-700', onConfirm }) {
    document.getElementById('actionModalTitle').textContent = title;
    document.getElementById('actionModalDescription').textContent = description;
    document.getElementById('actionModalBody').innerHTML = body;
    document.getElementById('actionModalConfirmText').textContent = confirmText;
    const confirmBtn = document.getElementById('actionModalConfirm');
    confirmBtn.className = `px-5 py-3 rounded-xl text-white font-bold shadow-md transition ${confirmClass}`;
    confirmBtn.dataset.defaultText = confirmText;
    confirmBtn.disabled = false;
    actionModalHandler = onConfirm;
    document.getElementById('actionModal').classList.remove('hidden');
}

function closeActionModal() {
    if (document.getElementById('actionModalConfirm').disabled) return;
    document.getElementById('actionModal').classList.add('hidden');
    document.getElementById('actionModalBody').innerHTML = '';
    actionModalHandler = null;
}

function setActionLoading(isLoading, text = '处理中...') {
    const confirmBtn = document.getElementById('actionModalConfirm');
    const cancelBtn = document.getElementById('actionModalCancel');
    confirmBtn.disabled = isLoading;
    cancelBtn.disabled = isLoading;
    confirmBtn.classList.toggle('opacity-70', isLoading);
    confirmBtn.classList.toggle('cursor-not-allowed', isLoading);
    document.getElementById('actionModalConfirmText').innerHTML = isLoading ? `<i class="fas fa-spinner fa-spin mr-2"></i>${text}` : (confirmBtn.dataset.defaultText || '确认');
}

function showPasswordModal() {
    document.getElementById('passwordForm').reset();
    document.getElementById('passwordModal').classList.remove('hidden');
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.add('hidden');
}

async function changePassword(e) {
    e.preventDefault();
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitBtn = document.getElementById('passwordSubmitBtn');

    if (newPassword !== confirmPassword) {
        showToast('两次输入的新密码不一致', 'warning');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>保存中';
    try {
        const response = await fetch(`/api/current-user/password?token=${token}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword
            })
        });
        const data = await response.json();
        if (response.ok) {
            closePasswordModal();
            showToast('密码修改成功，请重新登录');
            setTimeout(() => {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                if (ws) {
                    ws.close();
                }
                window.location.href = '/static/index.html';
            }, 900);
        } else {
            showToast(data.detail || '密码修改失败', 'error');
        }
    } catch (error) {
        console.error('修改密码失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '保存';
    }
}

async function showTicketNumberModal() {
    try {
        const response = await fetch(`/api/settings/ticket-number?token=${token}`);
        const data = await response.json();
        if (response.ok) {
            document.getElementById('ticketNoPrefix').value = data.prefix || 'TK';
            document.getElementById('ticketNoDateFormat').value = data.date_format || '%Y%m%d%H%M%S';
            document.getElementById('ticketNoRandomDigits').value = data.random_digits || 3;
            updateTicketNumberPreview();
            document.getElementById('ticketNumberModal').classList.remove('hidden');
        } else {
            showToast(data.detail || '加载编号规则失败', 'error');
        }
    } catch (error) {
        console.error('加载编号规则失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

function closeTicketNumberModal() {
    document.getElementById('ticketNumberModal').classList.add('hidden');
}

async function showAuditLogModal() {
    document.getElementById('auditLogModal').classList.remove('hidden');
    await switchAuditTab('login');
}

function closeAuditLogModal() {
    document.getElementById('auditLogModal').classList.add('hidden');
}

async function switchAuditTab(type) {
    currentAuditType = type;
    const loginTab = document.getElementById('loginLogTab');
    const operationTab = document.getElementById('operationLogTab');
    loginTab.className = type === 'login'
        ? 'px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold'
        : 'px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200';
    operationTab.className = type === 'operation'
        ? 'px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold'
        : 'px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200';

    const container = document.getElementById('auditLogContent');
    container.innerHTML = '<div class="text-center text-gray-500 py-10"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</div>';

    try {
        const url = type === 'login' ? `/api/audit/login-logs?token=${token}` : `/api/audit/operation-logs?token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
            container.innerHTML = `<div class="text-center text-red-500 py-10">${data.detail || '加载失败'}</div>`;
            return;
        }
        renderAuditLogs(type, data.logs || []);
    } catch (error) {
        console.error('加载审计日志失败:', error);
        container.innerHTML = '<div class="text-center text-red-500 py-10">网络错误，请稍后重试</div>';
    }
}

function renderAuditLogs(type, logs, resetPage = true) {
    const container = document.getElementById('auditLogContent');
    currentAuditType = type;
    currentAuditLogs = logs;
    auditLogPagination.setTotal(logs.length, resetPage);
    if (!logs.length) {
        container.innerHTML = '<div class="text-center text-gray-500 py-10">暂无日志</div>';
        return;
    }

    const pageLogs = auditLogPagination.slice(logs);

    container.innerHTML = `
        <div class="overflow-x-auto rounded-xl border border-gray-100">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 text-gray-600">
                    <tr>
                        ${type === 'login' ? `
                            <th class="px-4 py-3 text-left">时间</th>
                            <th class="px-4 py-3 text-left">账号</th>
                            <th class="px-4 py-3 text-left">姓名</th>
                            <th class="px-4 py-3 text-left">状态</th>
                            <th class="px-4 py-3 text-left">IP</th>
                            <th class="px-4 py-3 text-left">说明</th>
                        ` : `
                            <th class="px-4 py-3 text-left">时间</th>
                            <th class="px-4 py-3 text-left">用户</th>
                            <th class="px-4 py-3 text-left">模块</th>
                            <th class="px-4 py-3 text-left">动作</th>
                            <th class="px-4 py-3 text-left">IP</th>
                            <th class="px-4 py-3 text-left">详情</th>
                        `}
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 bg-white">
                    ${pageLogs.map(log => type === 'login' ? `
                        <tr class="hover:bg-cyan-50/50">
                            <td class="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">${formatDateTime(log.created_at)}</td>
                            <td class="px-4 py-3 font-bold text-gray-900">${log.username || '-'}</td>
                            <td class="px-4 py-3">${log.real_name || '-'}</td>
                            <td class="px-4 py-3">${log.status === 'success' ? '<span class="px-2 py-1 rounded bg-green-100 text-green-700 font-bold text-xs">成功</span>' : '<span class="px-2 py-1 rounded bg-red-100 text-red-700 font-bold text-xs">失败</span>'}</td>
                            <td class="px-4 py-3 font-mono text-xs text-gray-500">${log.ip_address || '-'}</td>
                            <td class="px-4 py-3 text-gray-600">${log.message || '-'}</td>
                        </tr>
                    ` : `
                        <tr class="hover:bg-cyan-50/50">
                            <td class="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">${formatDateTime(log.created_at)}</td>
                            <td class="px-4 py-3"><span class="font-bold text-gray-900">${log.real_name || '-'}</span><span class="text-gray-400 ml-1">${log.username || ''}</span></td>
                            <td class="px-4 py-3">${log.module || '-'}</td>
                            <td class="px-4 py-3 font-bold text-gray-800">${log.action || '-'}</td>
                            <td class="px-4 py-3 font-mono text-xs text-gray-500">${log.ip_address || '-'}</td>
                            <td class="px-4 py-3 text-gray-600">${log.detail || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function updateTicketNumberPreview() {
    const prefix = document.getElementById('ticketNoPrefix').value || 'TK';
    const randomDigits = Math.max(1, Math.min(12, parseInt(document.getElementById('ticketNoRandomDigits').value || '3', 10)));
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');
    const dateText = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    document.getElementById('ticketNoPreview').textContent = `${prefix}${dateText}${'7'.repeat(randomDigits)}`;
}

async function saveTicketNumberSettings(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('ticketNumberSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>保存中';
    try {
        const response = await fetch(`/api/settings/ticket-number?token=${token}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prefix: document.getElementById('ticketNoPrefix').value,
                date_format: document.getElementById('ticketNoDateFormat').value,
                random_digits: parseInt(document.getElementById('ticketNoRandomDigits').value, 10)
            })
        });
        const data = await response.json();
        if (response.ok) {
            closeTicketNumberModal();
            showToast('编号规则已保存');
        } else {
            showToast(data.detail || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存编号规则失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '保存';
    }
}

// 建立WebSocket连接
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${token}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket连接已建立');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket连接已关闭，5秒后重连...');
        setTimeout(connectWebSocket, 5000);
    };
}

// 处理WebSocket消息
function handleWebSocketMessage(data) {
    // 显示通知
    showNotification(data.message);
    
    // 刷新数据
    loadStatistics();
    loadTickets();
    loadNotifications();
}

// 显示浏览器通知
function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('IT运维工单系统', {
            body: message,
            icon: '/static/favicon.ico'
        });
    }
}

// 请求通知权限
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// 加载统计数据
async function loadStatistics() {
    try {
        const response = await fetch(`/api/statistics?token=${token}`);
        const data = await response.json();
        
        if (currentUser.role_type === 'user') {
            document.getElementById('totalTickets').textContent = data.my_tickets || 0;
        } else {
            document.getElementById('totalTickets').textContent = data.total_tickets || 0;
        }
        
        document.getElementById('pendingTickets').textContent = data.pending_tickets || 0;
        document.getElementById('processingTickets').textContent = data.processing_tickets || 0;
        document.getElementById('completedTickets').textContent = data.completed_tickets || 0;
        
        // 显示满意度
        const avgSatisfaction = document.getElementById('avgSatisfaction');
        const satisfactionCard = document.getElementById('satisfactionCard');
        
        if (currentUser.role_type !== 'user') {
            if (satisfactionCard) {
                satisfactionCard.classList.remove('hidden');
            }
            
            if (avgSatisfaction) {
                if (currentUser.role_type === 'it' && data.my_avg_satisfaction) {
                    avgSatisfaction.textContent = data.my_avg_satisfaction;
                    avgSatisfaction.nextElementSibling.textContent = 'My Satisfaction';
                } else {
                    avgSatisfaction.textContent = data.avg_satisfaction || '0.0';
                }
            }
        } else {
            // 确保普通用户不显示满意度卡片
            if (satisfactionCard) {
                satisfactionCard.classList.add('hidden');
            }
        }

        allEngineerStats = data.engineer_stats || [];
        renderEngineerStats(allEngineerStats);
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

function renderEngineerStats(stats, resetPage = true) {
    const container = document.getElementById('engineerStatsContainer');
    const list = document.getElementById('engineerStatsList');
    if (!container || !list) return;

    allEngineerStats = stats;
    engineerStatsPagination.setTotal(stats.length, resetPage);
    if (!stats.length) {
        container.classList.add('hidden');
        list.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    const rankOffset = (engineerStatsPagination.getCurrentPage() - 1) * 8;
    list.innerHTML = engineerStatsPagination.slice(stats).map((stat, index) => {
        const rank = rankOffset + index;
        let rankClass = 'bg-gray-100 text-gray-600';
        let icon = 'fa-user-cog';

        if (rank === 0) {
            rankClass = 'bg-yellow-100 text-yellow-700';
            icon = 'fa-crown';
        } else if (rank === 1) {
            rankClass = 'bg-gray-200 text-gray-700';
        } else if (rank === 2) {
            rankClass = 'bg-orange-100 text-orange-700';
        }

        return `
            <div class="flex items-center p-4 rounded-xl border border-gray-100 hover:shadow-md transition bg-gray-50">
                <div class="w-12 h-12 rounded-full ${rankClass} flex items-center justify-center text-xl mr-4 shadow-sm">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-center mb-1">
                        <h4 class="font-bold text-gray-900">${stat.name}</h4>
                        <span class="text-xs font-mono text-gray-400">#${rank + 1}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center text-yellow-500">
                            <span class="font-black text-lg mr-1">${stat.avg_satisfaction}</span>
                            <i class="fas fa-star text-xs"></i>
                        </div>
                        <span class="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                            ${stat.rated_count}次评价
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 加载工单分类
async function loadCategories() {
    try {
        const response = await fetch(`/api/categories?token=${token}`);
        const data = await response.json();
        categories = data.categories; // 保存分类数据
        
        const select = document.getElementById('ticketCategory');
        select.innerHTML = '<option value="">请选择分类</option>';
        
        data.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.category_name;
            select.appendChild(option);
        });
        
        // 绑定 change 事件以渲染动态表单
        select.addEventListener('change', renderDynamicForm);
    } catch (error) {
        console.error('加载分类失败:', error);
    }
}

// 加载IT工程师列表
async function loadEngineers() {
    // 只有管理员和HR可以看到工程师筛选
    if (!['super_admin', 'admin', 'hr'].includes(currentUser.role_type)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users?token=${token}`);
        const data = await response.json();
        
        // 筛选出IT运维角色的用户
        const engineers = data.users.filter(user => user.role_type === 'it');
        
        const select = document.getElementById('engineerFilter');
        if (select && engineers.length > 0) {
            select.classList.remove('hidden');
            select.innerHTML = '<option value="">全部工程师</option>';
            
            engineers.forEach(engineer => {
                const option = document.createElement('option');
                option.value = engineer.id;
                option.textContent = engineer.real_name;
                select.appendChild(option);
            });
            
            // 绑定change事件
            select.addEventListener('change', filterTickets);
        }
    } catch (error) {
        console.error('加载工程师列表失败:', error);
    }
}

// 渲染动态表单
function renderDynamicForm() {
    const categoryId = parseInt(document.getElementById('ticketCategory').value);
    const container = document.getElementById('dynamicFormContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const category = categories.find(c => c.id === categoryId);
    if (category && category.form_template) {
        try {
            const template = JSON.parse(category.form_template);
            if (template.fields && Array.isArray(template.fields)) {
                // 创建字段映射，方便查找
                const fieldMap = {};
                template.fields.forEach(field => {
                    fieldMap[field.key] = field;
                });

                template.fields.forEach(field => {
                    const div = document.createElement('div');
                    div.className = 'mb-4 transition-all duration-300'; // 添加过渡效果
                    div.dataset.fieldKey = field.key; // 标记字段key
                    
                    // 处理条件显示
                    if (field.condition && field.condition.field) {
                        div.classList.add('hidden'); // 默认隐藏
                        div.dataset.conditionField = field.condition.field;
                        div.dataset.conditionValue = field.condition.value;
                    }
                    
                    const label = document.createElement('label');
                    label.className = 'block text-sm font-semibold text-gray-700 mb-2';
                    label.textContent = field.label + (field.required ? ' *' : '');
                    div.appendChild(label);
                    
                    let input;
                    if (field.type === 'select') {
                        input = document.createElement('select');
                        input.className = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition';
                        if (field.options) {
                            field.options.forEach(opt => {
                                const option = document.createElement('option');
                                option.value = opt;
                                option.textContent = opt;
                                input.appendChild(option);
                            });
                        }
                        // 绑定change事件以触发条件检查
                        input.addEventListener('change', checkConditions);
                    } else if (field.type === 'checkbox') {
                        // 复选框特殊处理
                        input = document.createElement('div');
                        input.className = 'space-y-2';
                        if (field.options) {
                            field.options.forEach(opt => {
                                const wrapper = document.createElement('div');
                                wrapper.className = 'flex items-center';
                                
                                const cb = document.createElement('input');
                                cb.type = 'checkbox';
                                cb.value = opt;
                                cb.name = field.key; // 使用name分组
                                cb.className = 'h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded';
                                cb.addEventListener('change', checkConditions);
                                
                                const span = document.createElement('span');
                                span.className = 'ml-2 text-sm text-gray-700';
                                span.textContent = opt;
                                
                                wrapper.appendChild(cb);
                                wrapper.appendChild(span);
                                input.appendChild(wrapper);
                            });
                        }
                        // 标记为复选框容器
                        input.dataset.isCheckboxGroup = 'true';
                    } else if (field.type === 'textarea') {
                        input = document.createElement('textarea');
                        input.rows = 3;
                        input.className = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition';
                    } else {
                        input = document.createElement('input');
                        input.type = field.type === 'number' ? 'number' : (field.type === 'date' ? 'date' : 'text');
                        input.className = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition';
                    }
                    
                    if (field.type !== 'checkbox') {
                        input.dataset.customField = field.key;
                        if (field.required) input.required = true;
                        if (field.placeholder) input.placeholder = field.placeholder;
                    } else {
                        // 复选框组的自定义属性放在容器上
                        input.dataset.customFieldGroup = field.key;
                    }
                    
                    div.appendChild(input);
                    container.appendChild(div);
                });
                
                // 初始检查一次条件
                checkConditions();
            }
        } catch (e) {
            console.error('解析表单模板失败', e);
        }
    }
}

// 检查表单条件显示
function checkConditions() {
    const container = document.getElementById('dynamicFormContainer');
    if (!container) return;
    
    const fields = container.querySelectorAll('[data-condition-field]');
    
    fields.forEach(div => {
        const depKey = div.dataset.conditionField;
        const depValue = div.dataset.conditionValue;
        
        // 查找依赖字段的值
        let currentValue = null;
        
        // 尝试查找select/input
        const depInput = container.querySelector(`[data-custom-field="${depKey}"]`);
        if (depInput) {
            currentValue = depInput.value;
        } else {
            // 尝试查找checkbox组
            const depGroup = container.querySelector(`[data-custom-field-group="${depKey}"]`);
            if (depGroup) {
                // 复选框只要选中了对应的值就算匹配
                const checked = Array.from(depGroup.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                if (checked.includes(depValue)) {
                    currentValue = depValue;
                }
            }
        }
        
        if (currentValue === depValue) {
            div.classList.remove('hidden');
            // 如果显示了，且是必填，恢复required属性
            const input = div.querySelector('input, select, textarea');
            if (input && input.hasAttribute('data-required-backup')) {
                input.required = true;
                input.removeAttribute('data-required-backup');
            }
        } else {
            div.classList.add('hidden');
            // 如果隐藏了，取消required属性，避免无法提交
            const input = div.querySelector('input, select, textarea');
            if (input && input.required) {
                input.required = false;
                input.setAttribute('data-required-backup', 'true');
            }
        }
    });
}

// 加载工单列表
async function loadTickets(status = '') {
    try {
        // 修复Bug：更新下拉框状态
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.value = status;
        }

        const url = status ? `/api/tickets?token=${token}&status=${status}` : `/api/tickets?token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        allTickets = data.tickets || [];
        
        renderTickets(allTickets);
    } catch (error) {
        console.error('加载工单列表失败:', error);
    }
}

// IT人员加载分配给自己的工单
async function loadMyAssignedTickets() {
    try {
        const response = await fetch(`/api/tickets?token=${token}`);
        const data = await response.json();
        
        // 筛选出分配给当前IT人员的工单
        const myTickets = data.tickets.filter(ticket => ticket.assigned_to === currentUser.id);
        allTickets = myTickets;
        renderTickets(myTickets);
    } catch (error) {
        console.error('加载我的工单失败:', error);
    }
}

// 加载待处理工单（除了已完成、已结单之外的所有状态）
async function loadPendingTickets() {
    try {
        const response = await fetch(`/api/tickets?token=${token}`);
        const data = await response.json();
        
        // 待处理工单：除了已完成、已结单、已驳回之外的所有状态
        let pendingTickets = data.tickets.filter(ticket => 
            ticket.status !== 'completed' && ticket.status !== 'closed' && ticket.status !== 'rejected'
        );
        
        // 根据用户角色过滤
        if (currentUser.role_type === 'it') {
            // IT运维只显示分配给自己的待处理工单
            pendingTickets = pendingTickets.filter(ticket => ticket.assigned_to === currentUser.id || ticket.status === 'pending' || ticket.can_approve_workflow);
        }
        // 管理员和超级管理员可以看到所有待处理工单
        
        allTickets = pendingTickets;
        renderTickets(pendingTickets);
        
        // 更新状态筛选下拉框为空（显示自定义筛选）
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.value = '';
        }
    } catch (error) {
        console.error('加载待处理工单失败:', error);
    }
}

// 普通用户加载自己提交的工单
async function loadMySubmittedTickets() {
    try {
        const response = await fetch(`/api/tickets?token=${token}`);
        const data = await response.json();
        
        // 后端已经返回当前用户提交、审批、抄送相关的工单
        const myTickets = data.tickets || [];
        allTickets = myTickets;
        renderTickets(myTickets);
    } catch (error) {
        console.error('加载我的工单失败:', error);
    }
}

// 渲染工单列表
function renderTickets(tickets, resetPage = true) {
    const tbody = document.getElementById('ticketTableBody');
    displayedTickets = tickets;
    ticketPagination.setTotal(tickets.length, resetPage);
    
    if (tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">暂无工单</td></tr>';
        return;
    }

    const pageTickets = ticketPagination.slice(tickets);
    
    tbody.innerHTML = pageTickets.map(ticket => {
        const statusBadge = getStatusBadge(ticket.status);
        const priorityBadge = getPriorityBadge(ticket.priority);
        const actions = getTicketActions(ticket);
        const workflowBadge = ticket.can_approve_workflow
            ? '<span class="inline-flex items-center mt-2 px-2 py-1 text-xs font-bold rounded-full bg-cyan-100 text-cyan-800"><i class="fas fa-user-check mr-1"></i>待我审批</span>'
            : ticket.workflow_current_node_name && ticket.status === 'pending_approval'
                ? `<span class="inline-flex items-center mt-2 px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700"><i class="fas fa-sitemap mr-1"></i>${ticket.workflow_current_node_name}</span>`
                : '';
        
        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button type="button" onclick="viewTicketDetail(${ticket.id})" class="text-indigo-600 hover:text-indigo-900 hover:underline font-bold" title="查看工单详情">${ticket.ticket_no}</button>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                    <button type="button" onclick="viewTicketDetail(${ticket.id})" class="font-bold text-gray-900 hover:text-indigo-700 text-left">${ticket.title}</button>
                    <div>${workflowBadge}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${ticket.category_name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${ticket.submitter_real_name}</td>
                <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap">${priorityBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${formatDateTime(ticket.created_at)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button onclick="viewTicketDetail(${ticket.id})" class="text-indigo-600 hover:text-indigo-900 mr-2">
                        <i class="fas fa-eye"></i> 查看
                    </button>
                    ${actions}
                </td>
            </tr>
        `;
    }).join('');
}

// 获取状态徽章
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">待处理</span>',
        'pending_approval': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-800">待审批</span>',
        'rejected': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">已驳回</span>',
        'claimed': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">已认领</span>',
        'processing': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">处理中</span>',
        'completed': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">已完成</span>',
        'closed': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">已结单</span>'
    };
    return badges[status] || status;
}

// 获取优先级徽章
function getPriorityBadge(priority) {
    const badges = {
        'low': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">低</span>',
        'medium': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">中</span>',
        'high': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">高</span>',
        'urgent': '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">紧急</span>'
    };
    return badges[priority] || priority;
}

function parseWorkflowSnapshot(ticket) {
    if (ticket.workflow && Array.isArray(ticket.workflow.nodes)) {
        return ticket.workflow;
    }
    if (!ticket.workflow_snapshot) return null;
    try {
        const workflow = JSON.parse(ticket.workflow_snapshot);
        return workflow && Array.isArray(workflow.nodes) ? workflow : null;
    } catch (error) {
        return null;
    }
}

function getCurrentWorkflowNode(workflow) {
    if (!workflow || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) return null;
    const index = Number.isInteger(workflow.current_index) ? workflow.current_index : workflow.nodes.findIndex(node => node.status === 'pending');
    return workflow.nodes[index >= 0 ? index : 0] || null;
}

function isCurrentWorkflowApprover(ticket) {
    if (ticket.can_approve_workflow) return true;
    if (ticket.status !== 'pending_approval') return false;
    const node = getCurrentWorkflowNode(parseWorkflowSnapshot(ticket));
    return !!node && Array.isArray(node.approver_ids) && node.approver_ids.map(Number).includes(Number(currentUser.id));
}

function canDeleteTicket(ticket) {
    if (!currentUser || !ticket) return false;
    if (['super_admin', 'admin'].includes(currentUser.role_type)) return true;
    if (currentUser.role_type !== 'it') return false;
    return ticket.submitter_id === currentUser.id ||
        ticket.assigned_to === currentUser.id ||
        ticket.workflow_relation === 'current_approver' ||
        ticket.workflow_relation === 'participant' ||
        isCurrentWorkflowApprover(ticket);
}

function getWorkflowNodeStatus(node) {
    const statusMap = {
        pending: { text: '待审批', badge: 'bg-cyan-100 text-cyan-800', dot: 'bg-cyan-500' },
        waiting: { text: '待流转', badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-300' },
        approved: { text: '已通过', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
        rejected: { text: '已驳回', badge: 'bg-red-100 text-red-800', dot: 'bg-red-500' }
    };
    return statusMap[node.status || 'waiting'] || statusMap.waiting;
}

function renderWorkflowPanel(ticket) {
    const workflow = parseWorkflowSnapshot(ticket);
    if (!workflow || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) return '';

    const canApprove = isCurrentWorkflowApprover(ticket);
    const currentNode = getCurrentWorkflowNode(workflow);
    const doneCount = workflow.nodes.filter(node => node.status === 'approved').length;
    const rejectedCount = workflow.nodes.filter(node => node.status === 'rejected').length;
    const progressText = rejectedCount > 0 ? '已驳回' : `${doneCount}/${workflow.nodes.length} 已通过`;
    const currentApprovers = currentNode
        ? ((currentNode.approvers || []).map(user => user.real_name).join('、') || (currentNode.approver_ids || []).join('、') || '未配置')
        : '-';
    const actionPanel = canApprove && currentNode ? `
        <div class="mt-5 border-2 border-cyan-200 bg-cyan-50 rounded-2xl p-5">
            <div class="flex items-start justify-between gap-4 mb-4">
                <div>
                    <p class="text-xs font-black text-cyan-700 uppercase tracking-wider">当前待办</p>
                    <h4 class="text-lg font-black text-gray-900 mt-1">${currentNode.name || '审批节点'}</h4>
                    <p class="text-sm text-gray-600 mt-1">请确认信息无误后审批，驳回会结束当前流程。</p>
                </div>
                <span class="shrink-0 px-3 py-1 rounded-full bg-white text-cyan-700 text-xs font-black border border-cyan-200">待我审批</span>
            </div>
            <label class="block text-sm font-bold text-gray-700 mb-2">审批意见</label>
            <textarea id="workflowApprovalComment" rows="3" class="w-full px-4 py-3 border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 resize-none bg-white" placeholder="可填写审批意见，例如：同意、请补充说明、预算不通过等"></textarea>
            <div class="flex flex-col sm:flex-row gap-3 mt-4">
                <button onclick="submitWorkflowAction(${ticket.id}, 'approve')" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-md transition">
                    <i class="fas fa-check mr-2"></i>审批通过
                </button>
                <button onclick="submitWorkflowAction(${ticket.id}, 'reject')" class="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow-md transition">
                    <i class="fas fa-times mr-2"></i>驳回
                </button>
            </div>
        </div>
    ` : '';

    return `
        <div class="bg-white border border-cyan-100 rounded-2xl p-5 shadow-sm">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
                <div>
                    <h3 class="text-lg font-bold text-gray-900 flex items-center">
                        <i class="fas fa-sitemap mr-2 text-cyan-600"></i>审批流程
                    </h3>
                    <p class="text-sm text-gray-500 mt-1">当前节点：${ticket.status === 'pending_approval' && currentNode ? currentNode.name : progressText}</p>
                </div>
                <div class="text-left sm:text-right">
                    <span class="inline-flex items-center px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-black border border-cyan-100">${progressText}</span>
                    ${ticket.status === 'pending_approval' ? `<p class="text-xs text-gray-500 mt-2">当前审批人：${currentApprovers}</p>` : ''}
                </div>
            </div>
            <div class="space-y-3">
                ${workflow.nodes.map((node, index) => {
                    const status = getWorkflowNodeStatus(node);
                    const approvers = (node.approvers || []).map(user => user.real_name).join('、') || (node.approver_ids || []).join('、') || '未配置';
                    const ccUsers = (node.cc_users || []).map(user => user.real_name).join('、') || (node.cc_ids || []).join('、') || '无';
                    const isCurrent = ticket.status === 'pending_approval' && currentNode && currentNode.id === node.id;
                    return `
                        <div class="${isCurrent ? 'border-cyan-300 bg-cyan-50' : 'border-gray-100 bg-gray-50'} border rounded-xl p-4">
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div class="flex items-center gap-3">
                                    <span class="w-7 h-7 rounded-full ${status.dot} text-white text-xs font-black flex items-center justify-center">${index + 1}</span>
                                    <p class="font-bold text-gray-900">${node.name || `审批节点${index + 1}`}</p>
                                </div>
                                <span class="px-2 py-1 text-xs font-bold rounded-full ${status.badge}">${status.text}</span>
                            </div>
                            <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <p class="text-gray-600"><span class="font-bold text-gray-800">审批人：</span>${approvers}</p>
                                <p class="text-gray-600"><span class="font-bold text-gray-800">抄送：</span>${ccUsers}</p>
                            </div>
                            ${node.comment ? `<p class="mt-2 text-sm text-gray-600"><span class="font-bold text-gray-800">节点说明：</span>${node.comment}</p>` : ''}
                            ${node.approved_by_name ? `
                                <div class="mt-3 rounded-lg bg-white border border-gray-100 p-3 text-sm">
                                    <p class="font-bold text-gray-800">${node.approved_by_name} ${status.text}</p>
                                    <p class="text-xs text-gray-500 mt-1">${formatDateTime(node.approved_at)}</p>
                                    ${node.approval_comment ? `<p class="text-gray-600 mt-2 whitespace-pre-wrap">${node.approval_comment}</p>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            ${actionPanel}
        </div>
    `;
}

// 获取工单操作按钮
function getTicketActions(ticket) {
    let actions = '';

    if (isCurrentWorkflowApprover(ticket)) {
        actions += `<button onclick="viewTicketDetail(${ticket.id})" class="inline-flex items-center px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold mr-2 shadow-sm">
            <i class="fas fa-user-check mr-1"></i> 去审批
        </button>`;
    }
    
    // IT人员可以认领待处理的工单
    if (currentUser.role_type === 'it' && ticket.status === 'pending') {
        actions += `<button onclick="claimTicket(${ticket.id})" class="text-blue-600 hover:text-blue-900 mr-2">
            <i class="fas fa-hand-paper"></i> 认领
        </button>`;
    }
    
    // IT人员可以处理已认领的工单
    if (currentUser.role_type === 'it' && ticket.assigned_to === currentUser.id && ticket.status === 'claimed') {
        actions += `<button onclick="processTicket(${ticket.id})" class="text-purple-600 hover:text-purple-900 mr-2">
            <i class="fas fa-cog"></i> 处理
        </button>`;
    }
    
    // IT人员可以完成处理中的工单
    if (currentUser.role_type === 'it' && ticket.assigned_to === currentUser.id && ticket.status === 'processing') {
        actions += `<button onclick="showCompleteModal(${ticket.id})" class="text-green-600 hover:text-green-900 mr-2">
            <i class="fas fa-check"></i> 完成
        </button>`;
    }
    
    // 提交人可以评价已完成的工单（如果未评价）
    if (ticket.submitter_id === currentUser.id && ticket.status === 'completed' && !ticket.satisfaction) {
        actions += `<button onclick="viewTicketDetail(${ticket.id})" class="text-pink-600 hover:text-pink-900">
            <i class="fas fa-star"></i> 评价
        </button>`;
    }

    if (canDeleteTicket(ticket)) {
        actions += `<button onclick="deleteTicket(${ticket.id})" class="text-red-600 hover:text-red-800 ml-2">
            <i class="fas fa-trash"></i> 删除
        </button>`;
    }
    
    return actions;
}

// 格式化日期时间
function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    let normalized = String(dateStr);
    if (/^\d{4}-\d{2}-\d{2}T/.test(normalized) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)) {
        normalized = normalized.replace('T', ' ');
    }
    const date = new Date(normalized.replace(/-/g, '/'));
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// 筛选工单
function filterTickets() {
    const status = document.getElementById('statusFilter').value;
    const engineerFilter = document.getElementById('engineerFilter');
    const engineerId = engineerFilter ? engineerFilter.value : '';
    
    let filtered = allTickets;
    
    // 按状态筛选
    if (status) {
        filtered = filtered.filter(ticket => ticket.status === status);
    }
    
    // 按工程师筛选
    if (engineerId) {
        filtered = filtered.filter(ticket => ticket.assigned_to == engineerId);
    }
    
    renderTickets(filtered);
}

// 显示创建工单模态框
function showCreateTicketModal() {
    document.getElementById('createTicketModal').classList.remove('hidden');
}

// 关闭创建工单模态框
function closeCreateTicketModal() {
    document.getElementById('createTicketModal').classList.add('hidden');
    document.getElementById('createTicketForm').reset();
}

// 创建工单
async function createTicket(e) {
    e.preventDefault();
    
    // 收集自定义字段数据
    const customFields = {};
    
    // 处理普通输入框
    const inputs = document.querySelectorAll('[data-custom-field]');
    inputs.forEach(input => {
        // 如果字段被隐藏（因条件不满足），则不提交该字段数据
        if (input.closest('.hidden')) return;
        customFields[input.dataset.customField] = input.value;
    });
    
    // 处理复选框组
    const checkboxGroups = document.querySelectorAll('[data-custom-field-group]');
    checkboxGroups.forEach(group => {
        if (group.closest('.hidden')) return;
        const key = group.dataset.customFieldGroup;
        const checked = Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        customFields[key] = checked.join(', '); // 将数组转换为字符串存储
    });

    const ticketData = {
        title: document.getElementById('ticketTitle').value,
        category_id: parseInt(document.getElementById('ticketCategory').value),
        equipment_type: document.getElementById('equipmentType').value,
        priority: document.getElementById('ticketPriority').value,
        location: document.getElementById('ticketLocation').value,
        description: document.getElementById('ticketDescription').value,
        extra_data: JSON.stringify(customFields)
    };
    
    try {
        const response = await fetch(`/api/tickets?token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ticketData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('工单创建成功');
            closeCreateTicketModal();
            loadStatistics();
            loadTickets();
        } else {
            showToast(data.detail || '创建失败', 'error');
        }
    } catch (error) {
        console.error('创建工单失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

// 查看工单详情
async function viewTicketDetail(ticketId) {
    try {
        const response = await fetch(`/api/tickets/${ticketId}?token=${token}`);
        const data = await response.json();
        
        if (response.ok) {
            currentTicketDetail = data.ticket;
            renderTicketDetail(data.ticket);
            const deleteBtn = document.getElementById('deleteTicketDetailBtn');
            if (deleteBtn) {
                deleteBtn.classList.toggle('hidden', !canDeleteTicket(data.ticket));
            }
            document.getElementById('ticketDetailModal').classList.remove('hidden');
        }
    } catch (error) {
        console.error('加载工单详情失败:', error);
    }
}

// 渲染工单详情
function renderTicketDetail(ticket) {
    const content = document.getElementById('ticketDetailContent');
    
    const equipmentTypes = {
        'computer': '电脑',
        'printer': '打印机',
        'network': '网络设备',
        'other': '其他'
    };
    
    // 构建时间线数据
    const timelineEvents = [
        { title: '创建工单', time: ticket.created_at, icon: 'fa-plus', color: 'bg-blue-500' }
    ];
    
    if (ticket.claimed_at) {
        timelineEvents.push({ title: '认领工单', time: ticket.claimed_at, icon: 'fa-hand-paper', color: 'bg-purple-500' });
    }
    
    if (ticket.completed_at) {
        timelineEvents.push({ title: '完成工单', time: ticket.completed_at, icon: 'fa-check', color: 'bg-green-500' });
    }
    
    if (ticket.closed_at) {
        timelineEvents.push({ title: '已结单', time: ticket.closed_at, icon: 'fa-times-circle', color: 'bg-gray-500' });
    }
    
    // 按时间正序排序时间线
    timelineEvents.sort((a, b) => new Date(a.time) - new Date(b.time));
    const workflowHtml = renderWorkflowPanel(ticket);
    const visibleLogs = (ticket.logs || []).filter(log => !['发起审批', '审批流程'].includes(log.action));

    // 构建自定义字段HTML
    let customFieldsHtml = '';
    if (ticket.extra_data) {
        try {
            const extraData = JSON.parse(ticket.extra_data);
            const category = categories.find(c => c.id === ticket.category_id);
            let fields = [];
            if (category && category.form_template) {
                const template = JSON.parse(category.form_template);
                fields = template.fields || [];
            }
            
            if (Object.keys(extraData).length > 0) {
                customFieldsHtml = `
                    <div class="bg-gray-50 rounded-xl p-6 border border-gray-100 mt-6">
                        <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <i class="fas fa-list-alt mr-2 text-indigo-600"></i>其他信息
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                `;
                
                for (const [key, value] of Object.entries(extraData)) {
                    const fieldDef = fields.find(f => f.key === key);
                    const label = fieldDef ? fieldDef.label : key;
                    
                    customFieldsHtml += `
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">${label}</p>
                            <p class="text-base font-medium text-gray-800">${value}</p>
                        </div>
                    `;
                }
                
                customFieldsHtml += `
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            console.error('解析 extra_data 失败', e);
        }
    }

    // 评价区域HTML
    let satisfactionHtml = '';
    if (ticket.status === 'completed' || ticket.status === 'closed') {
        if (ticket.satisfaction) {
            // 已评价
            const stars = Array(5).fill(0).map((_, i) => 
                `<i class="fas fa-star ${i < ticket.satisfaction ? 'text-yellow-400' : 'text-gray-300'}"></i>`
            ).join('');
            
            satisfactionHtml = `
                <div>
                    <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center">
                        <i class="fas fa-star mr-2 text-yellow-500"></i>服务评价
                    </h3>
                    <div class="bg-yellow-50 border-2 border-yellow-100 rounded-xl p-5 shadow-sm">
                        <div class="flex items-center mb-2">
                            <span class="text-sm font-bold text-gray-700 mr-3">满意度评分：</span>
                            <div class="text-lg">${stars}</div>
                            <span class="ml-2 text-sm text-gray-600 font-medium">${ticket.satisfaction}分</span>
                        </div>
                        ${ticket.satisfaction_comment ? `
                            <div class="mt-2">
                                <span class="text-sm font-bold text-gray-700">评价内容：</span>
                                <p class="text-gray-600 text-sm mt-1">${ticket.satisfaction_comment}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else if (ticket.submitter_id === currentUser.id) {
            // 未评价且当前用户是提交人
            satisfactionHtml = `
                <div>
                    <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center">
                        <i class="fas fa-star mr-2 text-yellow-500"></i>服务评价
                    </h3>
                    <div class="bg-white border-2 border-yellow-200 rounded-xl p-5 shadow-sm">
                        <p class="text-sm text-gray-600 mb-4">请对本次服务进行评价，您的反馈将帮助我们做得更好。</p>
                        <form id="rateTicketForm" onsubmit="rateTicket(event, ${ticket.id})">
                            <div class="mb-4">
                                <label class="block text-sm font-bold text-gray-700 mb-2">满意度评分</label>
                                <div class="flex space-x-2 text-2xl text-gray-300 cursor-pointer" id="starRating">
                                    <i class="fas fa-star hover:text-yellow-400 transition" onclick="setRating(1)"></i>
                                    <i class="fas fa-star hover:text-yellow-400 transition" onclick="setRating(2)"></i>
                                    <i class="fas fa-star hover:text-yellow-400 transition" onclick="setRating(3)"></i>
                                    <i class="fas fa-star hover:text-yellow-400 transition" onclick="setRating(4)"></i>
                                    <i class="fas fa-star hover:text-yellow-400 transition" onclick="setRating(5)"></i>
                                </div>
                                <input type="hidden" id="ratingValue" required>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-bold text-gray-700 mb-2">评价内容</label>
                                <textarea id="ratingComment" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent" placeholder="请输入您的评价..."></textarea>
                            </div>
                            <button type="submit" class="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-lg transition shadow-md">
                                提交评价
                            </button>
                        </form>
                    </div>
                </div>
            `;
        }
    }

    content.innerHTML = `
        <div class="space-y-8">
            <!-- 基本信息区域 -->
            <div class="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <i class="fas fa-info-circle mr-2 text-indigo-600"></i>基本信息
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">工单编号</p>
                            <p class="text-base font-bold text-indigo-700">${ticket.ticket_no}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">状态</p>
                        <div class="flex items-center">
                            ${getStatusBadge(ticket.status)}
                        </div>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">优先级</p>
                        <div class="flex items-center">
                            ${getPriorityBadge(ticket.priority)}
                        </div>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">分类</p>
                        <p class="text-base font-medium text-gray-800">${ticket.category_name}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">设备类型</p>
                            <p class="text-base font-medium text-gray-800">${equipmentTypes[ticket.equipment_type] || '其他'}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">位置</p>
                        <p class="text-base font-medium text-gray-800">${ticket.location || '未填写'}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">提交人</p>
                        <div class="flex items-center">
                            <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mr-2 text-xs">
                                ${ticket.submitter_real_name.charAt(0)}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-900">${ticket.submitter_real_name}</p>
                                <p class="text-xs text-gray-500">${ticket.submitter_department || ''}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">负责人</p>
                        ${ticket.assignee_name ? `
                            <div class="flex items-center">
                                <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold mr-2 text-xs">
                                    ${ticket.assignee_name.charAt(0)}
                                </div>
                                <p class="text-sm font-bold text-gray-900">${ticket.assignee_name}</p>
                            </div>
                        ` : '<p class="text-sm text-gray-500 italic">未分配</p>'}
                    </div>
                </div>
            </div>
            
            <!-- 详细描述区域 -->
            <div class="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8">
                <div class="space-y-6">
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center">
                            <i class="fas fa-align-left mr-2 text-indigo-600"></i>问题详情
                        </h3>
                        <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <p class="text-sm font-bold text-gray-900 mb-2">${ticket.title}</p>
                            <p class="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">${ticket.description}</p>
                        </div>
                    </div>
                    
                    ${customFieldsHtml}

                    ${workflowHtml}
                    
                    ${ticket.solution ? `
                        <div>
                            <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                <i class="fas fa-check-circle mr-2 text-green-600"></i>解决方案
                            </h3>
                            <div class="bg-green-50 border border-green-100 rounded-2xl p-5 shadow-sm">
                                <p class="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">${ticket.solution}</p>
                            </div>
                        </div>
                    ` : ''}

                    ${satisfactionHtml}
                </div>

                <!-- 右侧流程和日志 -->
                <div class="space-y-6">
                    <!-- 关键节点时间线 -->
                    <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <i class="fas fa-history mr-2 text-indigo-600"></i>关键节点
                        </h3>
                        <div class="relative pl-5 space-y-5 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-indigo-100">
                            ${timelineEvents.map((event, index) => `
                                <div class="relative">
                                    <div class="absolute -left-[22px] ${event.color} h-5 w-5 rounded-full border-4 border-white shadow-sm">
                                    </div>
                                    <div class="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center bg-gray-50 rounded-xl px-4 py-3">
                                        <p class="text-sm font-bold text-gray-800">${event.title}</p>
                                        <span class="text-xs font-medium text-gray-500 bg-white px-3 py-1.5 rounded-lg font-mono">
                                            ${formatDateTime(event.time)}
                                        </span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- 详细操作日志 -->
                    <div class="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <i class="fas fa-clipboard-list mr-2 text-indigo-600"></i>操作日志
                        </h3>
                        <div class="relative space-y-4 max-h-96 overflow-y-auto pr-2 soft-scrollbar">
                            ${visibleLogs.sort((a, b) => {
                                // 先按时间倒序排序（最新的在上面）
                                const timeDiff = new Date(b.created_at) - new Date(a.created_at);
                                if (timeDiff !== 0) return timeDiff;
                                // 如果时间相同，按ID倒序排序（ID大的在上面，即后创建的在上面）
                                return b.id - a.id;
                            }).map((log, index) => `
                                <div class="${index === 0 ? 'bg-indigo-50 border-indigo-200 shadow-md' : 'bg-gray-50 border-gray-100'} border p-4 rounded-2xl transition hover:border-indigo-200 hover:shadow-sm">
                                        <div class="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start mb-2">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <span class="text-sm font-bold text-gray-900 mr-2">${log.user_name}</span>
                                                <span class="px-2 py-0.5 rounded text-xs font-medium ${index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}">${log.action}</span>
                                                ${index === 0 ? '<span class="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white animate-pulse">最新</span>' : ''}
                                            </div>
                                            <span class="text-xs ${index === 0 ? 'text-blue-600 font-bold' : 'text-gray-400'} font-mono whitespace-nowrap">${formatDateTime(log.created_at)}</span>
                                        </div>
                                        <p class="text-sm ${index === 0 ? 'text-gray-800 font-medium' : 'text-gray-600'} leading-relaxed">${log.content}</p>
                                </div>
                            `).join('') || '<p class="text-sm text-gray-500 text-center py-6">暂无操作日志</p>'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 设置评分
function setRating(rating) {
    document.getElementById('ratingValue').value = rating;
    const stars = document.getElementById('starRating').children;
    for (let i = 0; i < stars.length; i++) {
        if (i < rating) {
            stars[i].classList.remove('text-gray-300');
            stars[i].classList.add('text-yellow-400');
        } else {
            stars[i].classList.remove('text-yellow-400');
            stars[i].classList.add('text-gray-300');
        }
    }
}

// 提交评价
async function rateTicket(e, ticketId) {
    e.preventDefault();
    
    const rating = document.getElementById('ratingValue').value;
    if (!rating) {
        showToast('请选择满意度评分', 'warning');
        return;
    }
    
    const comment = document.getElementById('ratingComment').value;
    
    try {
        const response = await fetch(`/api/tickets/${ticketId}/rate?token=${token}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                satisfaction: parseInt(rating),
                comment: comment
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('评价提交成功');
            viewTicketDetail(ticketId); // 刷新详情
            loadStatistics(); // 刷新统计
            loadTickets(); // 刷新列表
        } else {
            showToast(data.detail || '评价失败', 'error');
        }
    } catch (error) {
        console.error('评价失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    }
}

async function submitWorkflowAction(ticketId, action) {
    const commentEl = document.getElementById('workflowApprovalComment');
    const comment = commentEl ? commentEl.value.trim() : '';
    const actionText = action === 'approve' ? '通过' : '驳回';

    openActionModal({
        title: `确认审批${actionText}`,
        description: action === 'approve' ? '通过后工单会流转到下一审批节点，全部通过后进入IT处理。' : '驳回后工单会结束审批并通知提交人。',
        body: `<p class="text-sm text-gray-600 leading-relaxed">确认要${actionText}这个工单吗？</p>${comment ? `<p class="mt-3 text-sm text-gray-700 bg-gray-50 border rounded-xl p-3 whitespace-pre-wrap">${comment}</p>` : ''}`,
        confirmText: `审批${actionText}`,
        confirmClass: action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
        onConfirm: async () => {
            setActionLoading(true, '提交中...');
            try {
                const response = await fetch(`/api/tickets/${ticketId}/workflow?token=${token}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, comment })
                });
                const data = await response.json();
                if (response.ok) {
                    document.getElementById('actionModal').classList.add('hidden');
                    actionModalHandler = null;
                    showToast(data.message || `审批${actionText}成功`);
                    await loadStatistics();
                    await loadTickets();
                    await viewTicketDetail(ticketId);
                } else {
                    showToast(data.detail || '审批失败', 'error');
                    setActionLoading(false);
                }
            } catch (error) {
                console.error('审批失败:', error);
                showToast('网络错误，请稍后重试', 'error');
                setActionLoading(false);
            }
        }
    });
}

// 关闭工单详情模态框
function closeTicketDetailModal() {
    document.getElementById('ticketDetailModal').classList.add('hidden');
    const deleteBtn = document.getElementById('deleteTicketDetailBtn');
    if (deleteBtn) {
        deleteBtn.classList.add('hidden');
    }
}

function escapePrintText(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function printCurrentTicket() {
    if (!currentTicketDetail) {
        showToast('工单详情尚未加载完成', 'warning');
        return;
    }

    const detailContent = document.getElementById('ticketDetailContent');
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
        showToast('浏览器阻止了打印窗口，请允许弹窗后重试', 'warning');
        return;
    }

    const user = currentUser || {};
    const watermarkText = `账号: ${user.username || '未知账号'} | 姓名: ${user.real_name || '未知姓名'} | 邮箱: ${user.email || '未填写邮箱'} | 打印时间: ${formatDateTime(new Date().toISOString())}`;
    const watermarks = Array(42).fill(`<span>${escapePrintText(watermarkText)}</span>`).join('');

    printWindow.document.write(`<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <title>工单 ${escapePrintText(currentTicketDetail.ticket_no)}</title>
            <style>
                @page { size: A4; margin: 14mm; }
                * { box-sizing: border-box; }
                body { margin: 0; color: #1f2937; font-family: "PingFang SC", "PingFang TC", "Hiragino Sans GB", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: white; }
                .print-header { border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                .print-header h1 { margin: 0; font-size: 24px; }
                .print-header p { margin: 6px 0 0; color: #6b7280; font-size: 12px; }
                .print-ticket-no { color: #4338ca; font-weight: 700; }
                .space-y-8 > * + * { margin-top: 22px; }
                .space-y-6 > * + * { margin-top: 16px; }
                .space-y-5 > * + * { margin-top: 12px; }
                .space-y-4 > * + * { margin-top: 10px; }
                .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 22px; }
                .lg\\:grid-cols-\[1\.05fr_0\.95fr\] { grid-template-columns: 1.05fr .95fr; }
                h3 { margin-top: 0; break-after: avoid; }
                p { overflow-wrap: anywhere; }
                .rounded-2xl, .rounded-xl, .rounded-lg { border-radius: 10px; }
                .border, .border-2 { border: 1px solid #e5e7eb; }
                .p-6 { padding: 18px; } .p-5 { padding: 15px; } .p-4 { padding: 12px; }
                .bg-gray-50, .from-gray-50 { background: #f9fafb; }
                .bg-white { background: #fff; }
                .bg-green-50 { background: #f0fdf4; }
                .bg-yellow-50 { background: #fffbeb; }
                .text-xs { font-size: 11px; } .text-sm { font-size: 13px; } .text-base { font-size: 15px; } .text-lg { font-size: 17px; }
                .font-bold, .font-black, .font-semibold { font-weight: 700; }
                .text-gray-500, .text-gray-400 { color: #6b7280; }
                .text-gray-600 { color: #4b5563; }
                .text-gray-800, .text-gray-900 { color: #1f2937; }
                .text-indigo-700, .text-indigo-600 { color: #4338ca; }
                .whitespace-pre-wrap { white-space: pre-wrap; }
                .flex { display: flex; } .items-center { align-items: center; } .justify-between { justify-content: space-between; }
                .gap-2 { gap: 8px; } .mr-2 { margin-right: 8px; } .mb-1 { margin-bottom: 4px; } .mb-2 { margin-bottom: 8px; } .mb-3 { margin-bottom: 12px; } .mb-4 { margin-bottom: 16px; }
                form, button, .animate-pulse { display: none !important; }
                .max-h-96 { max-height: none; } .overflow-y-auto { overflow: visible; }
                .watermark-layer { position: fixed; inset: 0; z-index: 9999; pointer-events: none; display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 115px; align-items: center; justify-items: center; overflow: hidden; }
                .watermark-layer span { color: rgba(31, 41, 55, .13); font-size: 10px; font-weight: 700; white-space: nowrap; transform: rotate(-24deg); }
                .print-content { position: relative; z-index: 1; }
                @media print { .print-content { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
            </style>
        </head>
        <body>
            <div class="watermark-layer">${watermarks}</div>
            <main class="print-content">
                <header class="print-header">
                    <div><h1>IT运维工单</h1><p>工单详情及处理记录</p></div>
                    <div class="print-ticket-no">${escapePrintText(currentTicketDetail.ticket_no)}</div>
                </header>
                ${detailContent.innerHTML}
            </main>
        </body>
        </html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 300);
}

// 认领工单
async function claimTicket(ticketId) {
    openActionModal({
        title: '认领工单',
        description: '认领后该工单会分配给您处理。',
        body: '<p class="text-sm text-gray-600 leading-relaxed">确认要认领这个工单吗？</p>',
        confirmText: '确认认领',
        onConfirm: async () => {
            setActionLoading(true);
            try {
                const response = await fetch(`/api/tickets/${ticketId}/claim?token=${token}`, { method: 'PUT' });
                const data = await response.json();
                if (response.ok) {
                    closeActionAfterSuccess('认领成功');
                } else {
                    showToast(data.detail || '认领失败', 'error');
                    setActionLoading(false);
                }
            } catch (error) {
                console.error('认领工单失败:', error);
                showToast('网络错误，请稍后重试', 'error');
                setActionLoading(false);
            }
        }
    });
}

// 开始处理工单
async function processTicket(ticketId) {
    openActionModal({
        title: '开始处理',
        description: '可填写一段处理备注，提交人会收到通知。',
        body: `
            <label class="block text-sm font-semibold text-gray-700 mb-2">处理备注（可选）</label>
            <textarea id="processMessage" rows="4" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="例如：已开始排查网络连接问题"></textarea>
        `,
        confirmText: '开始处理',
        confirmClass: 'bg-purple-600 hover:bg-purple-700',
        onConfirm: async () => {
            const message = document.getElementById('processMessage').value.trim();
            setActionLoading(true);
            try {
                const url = `/api/tickets/${ticketId}/process?token=${token}${message ? `&message=${encodeURIComponent(message)}` : ''}`;
                const response = await fetch(url, { method: 'PUT' });
                const data = await response.json();
                if (response.ok) {
                    closeActionAfterSuccess('已开始处理');
                } else {
                    showToast(data.detail || '操作失败', 'error');
                    setActionLoading(false);
                }
            } catch (error) {
                console.error('处理工单失败:', error);
                showToast('网络错误，请稍后重试', 'error');
                setActionLoading(false);
            }
        }
    });
}

// 显示完成工单模态框
function showCompleteModal(ticketId) {
    openActionModal({
        title: '完成工单',
        description: '解决方案可选，留空也可以完成工单。',
        body: `
            <label class="block text-sm font-semibold text-gray-700 mb-2">解决方案（可选）</label>
            <textarea id="completeSolution" rows="5" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 resize-none" placeholder="可以填写处理结果、排查过程或留空"></textarea>
        `,
        confirmText: '确认完成',
        confirmClass: 'bg-green-600 hover:bg-green-700',
        onConfirm: async () => {
            const solution = document.getElementById('completeSolution').value.trim();
            await completeTicket(ticketId, solution);
        }
    });
}

// 完成工单
async function completeTicket(ticketId, solution) {
    setActionLoading(true, '完成中...');
    try {
        const response = await fetch(`/api/tickets/${ticketId}/complete?token=${token}&solution=${encodeURIComponent(solution)}`, {
            method: 'PUT'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeActionAfterSuccess('工单已完成');
        } else {
            showToast(data.detail || '操作失败', 'error');
            setActionLoading(false);
        }
    } catch (error) {
        console.error('完成工单失败:', error);
        showToast('网络错误，请稍后重试', 'error');
        setActionLoading(false);
    }
}

// 结单
async function closeTicket(ticketId) {
    openActionModal({
        title: '确认结单',
        description: '结单后该工单会进入已结单状态。',
        body: '<p class="text-sm text-gray-600 leading-relaxed">确认工单已经解决并结单吗？</p>',
        confirmText: '确认结单',
        confirmClass: 'bg-green-600 hover:bg-green-700',
        onConfirm: async () => {
            setActionLoading(true);
            try {
                const response = await fetch(`/api/tickets/${ticketId}/close?token=${token}`, { method: 'PUT' });
                const data = await response.json();
                if (response.ok) {
                    closeTicketDetailModal();
                    closeActionAfterSuccess('工单已结单');
                } else {
                    showToast(data.detail || '操作失败', 'error');
                    setActionLoading(false);
                }
            } catch (error) {
                console.error('结单失败:', error);
                showToast('网络错误，请稍后重试', 'error');
                setActionLoading(false);
            }
        }
    });
}

async function deleteTicket(ticketId) {
    openActionModal({
        title: '删除工单',
        description: '删除后该工单、通知和操作日志都会移除。',
        body: '<p class="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-4 leading-relaxed">确认要删除这个工单吗？此操作不可恢复。</p>',
        confirmText: '确认删除',
        confirmClass: 'bg-red-600 hover:bg-red-700',
        onConfirm: async () => {
            setActionLoading(true, '删除中...');
            try {
                const response = await fetch(`/api/tickets/${ticketId}?token=${token}`, { method: 'DELETE' });
                const data = await response.json();
                if (response.ok) {
                    closeTicketDetailModal();
                    closeActionAfterSuccess(data.message || '工单已删除');
                } else {
                    showToast(data.detail || '删除失败', 'error');
                    setActionLoading(false);
                }
            } catch (error) {
                console.error('删除工单失败:', error);
                showToast('网络错误，请稍后重试', 'error');
                setActionLoading(false);
            }
        }
    });
}

function deleteTicketFromDetail() {
    if (!currentTicketDetail) {
        showToast('工单详情尚未加载完成', 'warning');
        return;
    }
    deleteTicket(currentTicketDetail.id);
}

function closeActionAfterSuccess(message) {
    document.getElementById('actionModal').classList.add('hidden');
    actionModalHandler = null;
    showToast(message);
    loadStatistics();
    loadTickets();
}

// 加载通知
async function loadNotifications() {
    try {
        const response = await fetch(`/api/notifications?token=${token}`);
        const data = await response.json();
        
        const unreadCount = data.notifications.filter(n => !n.is_read).length;
        const badge = document.getElementById('notificationBadge');
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
        
        allNotifications = data.notifications;
        renderNotifications(allNotifications);
    } catch (error) {
        console.error('加载通知失败:', error);
    }
}

// 渲染通知列表
function renderNotifications(notifications, resetPage = true) {
    const list = document.getElementById('notificationList');
    allNotifications = notifications;
    notificationPagination.setTotal(notifications.length, resetPage);
    
    if (notifications.length === 0) {
        list.innerHTML = '<div class="p-4 text-center text-gray-500">暂无通知</div>';
        return;
    }
    
    list.innerHTML = notificationPagination.slice(notifications).map(notification => `
        <div class="p-4 hover:bg-gray-50 cursor-pointer ${notification.is_read ? 'opacity-60' : ''}" onclick="markNotificationRead(${notification.id})">
            <p class="text-sm font-semibold text-gray-800">${notification.title}</p>
            <p class="text-xs text-gray-600 mt-1">${notification.content}</p>
            <p class="text-xs text-gray-400 mt-1">${formatDateTime(notification.created_at)}</p>
        </div>
    `).join('');
}

// 切换通知下拉菜单
function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    dropdown.classList.toggle('hidden');
}

// 标记通知为已读
async function markNotificationRead(notificationId) {
    try {
        await fetch(`/api/notifications/${notificationId}/read?token=${token}`, {
            method: 'PUT'
        });
        loadNotifications();
    } catch (error) {
        console.error('标记通知失败:', error);
    }
}

// 标记所有通知为已读
window.markAllNotificationsRead = async function() {
    try {
        const response = await fetch(`/api/notifications/read-all?token=${token}`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            loadNotifications();
        }
    } catch (error) {
        console.error('标记所有通知失败:', error);
    }
};

// 退出登录
window.logout = function() {
    openActionModal({
        title: '退出登录',
        description: '退出后需要重新登录才能继续使用。',
        body: '<p class="text-sm text-gray-600">确定要退出当前账号吗？</p>',
        confirmText: '退出',
        confirmClass: 'bg-red-600 hover:bg-red-700',
        onConfirm: async () => {
        try {
            await fetch(`/api/logout?token=${token}`, { method: 'POST' });
        } catch (error) {
            console.error('退出登录记录失败:', error);
        }
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        if (ws) {
            ws.close();
        }
        window.location.href = '/static/index.html';
        }
    });
};
