document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const messageBox = document.getElementById('loginMessage');

  if (!form) return;

  const apiUrl = document.body?.dataset?.apiUrl || '/api/login';

  const showMessage = (text, type = 'error') => {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.className = '';
    if (type) messageBox.classList.add(type);
  };

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      showMessage('Please enter username and password.', 'error');
      return;
    }

    if (apiUrl.includes('<your-subdomain>') || apiUrl.includes('<your-worker')) {
      showMessage('Set your Cloudflare Worker URL in login.html data-api-url first.', 'error');
      return;
    }

    showMessage('Logging in...', '');

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.message || 'Invalid login', 'error');
        return;
      }

      showMessage('Login successful...', 'success');
      window.location.href = '/dashboard.html';
    } catch (error) {
      console.error('Login error:', error);
      showMessage('Server connection error. Check your Cloudflare Worker URL.', 'error');
    }
  });
});
