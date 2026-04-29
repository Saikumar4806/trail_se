(function () {
  const nativeAlert = window.alert.bind(window);

  const formatMessage = (message) => {
    const text = String(message ?? '');
    if (text.startsWith('✅ Success:')) {
      return {
        icon: 'success',
        title: 'Success',
        text: text.replace(/^✅ Success:\s*/,'').trim(),
      };
    }

    if (text.startsWith('❌ Error:')) {
      return {
        icon: 'error',
        title: 'Error',
        text: text.replace(/^❌ Error:\s*/,'').trim(),
      };
    }

    if (text.startsWith('⚠️')) {
      return {
        icon: 'warning',
        title: 'Warning',
        text: text.replace(/^⚠️\s*/,'').trim(),
      };
    }

    if (/Unauthorized access/i.test(text)) {
      return {
        icon: 'warning',
        title: 'Unauthorized',
        text,
      };
    }

    // Heuristic detection for common success / error keywords
    const lowered = text.toLowerCase();
    if (/\b(error|failed|unable|cannot|unauthorized|not found|fail)\b/.test(lowered)) {
      return { icon: 'error', title: 'Error', text };
    }

    if (/\b(success|completed|created|saved|deleted|added|updated)\b/.test(lowered)) {
      return { icon: 'success', title: 'Success', text };
    }

    return {
      icon: 'info',
      title: 'Notice',
      text,
    };
  };

  window.swalAlert = (message) => {
    const payload = formatMessage(message);
    if (window.Swal && typeof window.Swal.fire === 'function') {
      return window.Swal.fire({
        icon: payload.icon,
        title: payload.title,
        text: payload.text,
        confirmButtonText: 'OK',
      });
    }

    return nativeAlert(message);
  };

  // Show a SweetAlert2 confirm dialog and return a Promise<boolean>.
  // Usage: const ok = await window.swalConfirm('Are you sure?');
  window.swalConfirm = (message, options = {}) => {
    const text = String(message ?? '');
    if (window.Swal && typeof window.Swal.fire === 'function') {
      return window.Swal.fire(Object.assign({
        title: 'Are you sure?',
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel',
      }, options)).then((res) => !!res.isConfirmed);
    }

    // Fallback to native confirm (synchronous) wrapped into a Promise
    return Promise.resolve(window.confirm(text));
  };

  window.alert = window.swalAlert;
})();
