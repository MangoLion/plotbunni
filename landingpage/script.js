document.addEventListener('DOMContentLoaded', () => {
    const themeSwitcher = document.getElementById('theme-switcher');
    const themeIconLight = document.getElementById('theme-icon-light');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const lightImages = document.querySelectorAll('.light-image');
    const darkImages = document.querySelectorAll('.dark-image');
    const htmlElement = document.documentElement;

    // Function to apply theme
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            htmlElement.classList.add('dark');
            themeIconLight.classList.add('hidden');
            themeIconDark.classList.remove('hidden');
            lightImages.forEach(img => img.classList.add('hidden'));
            darkImages.forEach(img => img.classList.remove('hidden'));
            localStorage.setItem('theme', 'dark');
        } else {
            htmlElement.classList.remove('dark');
            themeIconLight.classList.remove('hidden');
            themeIconDark.classList.add('hidden');
            lightImages.forEach(img => img.classList.remove('hidden'));
            darkImages.forEach(img => img.classList.add('hidden'));
            localStorage.setItem('theme', 'light');
        }
    };

    // Check for saved theme preference or system preference
    const preferredTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(preferredTheme);

    // Theme switcher event listener
    themeSwitcher.addEventListener('click', () => {
        const currentTheme = htmlElement.classList.contains('dark') ? 'dark' : 'light';
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    // Update current year in footer
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
});
