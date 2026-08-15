document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const messageBox = document.getElementById('message');
  const submitBtn = document.querySelector('.submit-btn');
  const successState = document.getElementById('successState');

  if (!form) return;

  const apiUrl = document.body?.dataset?.apiUrl || 'https://opticalshop-login.<your-subdomain>.workers.dev/api/login';

  function setMessage(text, type = '') {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.className = 'message';
    if (type) messageBox.classList.add(type);
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('loading', isLoading);
    const btnText = submitBtn.querySelector('.btn-text');
    if (btnText) {
      btnText.textContent = isLoading ? 'Please wait...' : 'Login';
    }
  }

  function showSuccess() {
    if (successState) {
      successState.classList.add('show');
    }
    setMessage('Login successful! Redirecting...', 'success');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username')?.value?.trim();
    const password = document.getElementById('password')?.value?.trim();

    if (!username || !password) {
      setMessage('Please enter username and password.', 'error');
      return;
    }

    setLoading(true);
    setMessage('Checking credentials...', '');

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'login',
          username,
          password
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Invalid username or password.');
      }

      showSuccess();
      form.reset();

      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1500);
    } catch (error) {
      setLoading(false);
      setMessage(error.message || 'Something went wrong.', 'error');
    }
  });
});
