(function () {
    function createClientPagination(options) {
        const containerId = options.containerId;
        const pageSize = Math.max(1, options.pageSize || 10);
        const onPageChange = options.onPageChange || function () {};
        let currentPage = 1;
        let totalItems = 0;

        function totalPages() {
            return Math.max(1, Math.ceil(totalItems / pageSize));
        }

        function pageNumbers() {
            const pages = totalPages();
            const start = Math.max(1, Math.min(currentPage - 2, pages - 4));
            const end = Math.min(pages, start + 4);
            const result = [];
            for (let page = start; page <= end; page += 1) result.push(page);
            return result;
        }

        function render() {
            const container = document.getElementById(containerId);
            if (!container) return;

            const pages = totalPages();
            const from = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
            const to = Math.min(currentPage * pageSize, totalItems);
            const buttonClass = 'min-w-10 h-10 px-3 rounded-lg border font-bold text-sm transition';
            const disabledClass = 'opacity-40 cursor-not-allowed bg-gray-50 text-gray-400';

            container.innerHTML = `
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p class="text-sm text-gray-500">共 <span class="font-bold text-gray-800">${totalItems}</span> 条，当前显示 ${from}-${to} 条</p>
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="button" data-page="${currentPage - 1}" class="${buttonClass} ${currentPage === 1 ? disabledClass : 'bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-600'}" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
                        ${pageNumbers().map(page => `
                            <button type="button" data-page="${page}" class="${buttonClass} ${page === currentPage ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-600'}">${page}</button>
                        `).join('')}
                        <button type="button" data-page="${currentPage + 1}" class="${buttonClass} ${currentPage === pages ? disabledClass : 'bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-600'}" ${currentPage === pages ? 'disabled' : ''}>下一页</button>
                    </div>
                </div>
            `;

            container.querySelectorAll('[data-page]').forEach(button => {
                button.addEventListener('click', () => {
                    const nextPage = Number(button.dataset.page);
                    if (nextPage < 1 || nextPage > totalPages() || nextPage === currentPage) return;
                    currentPage = nextPage;
                    render();
                    onPageChange(currentPage);
                });
            });
        }

        return {
            setTotal(count, resetPage) {
                totalItems = Math.max(0, Number(count) || 0);
                if (resetPage !== false) currentPage = 1;
                currentPage = Math.min(currentPage, totalPages());
                render();
            },
            slice(items) {
                const start = (currentPage - 1) * pageSize;
                return items.slice(start, start + pageSize);
            },
            getCurrentPage() {
                return currentPage;
            }
        };
    }

    window.createClientPagination = createClientPagination;
})();
