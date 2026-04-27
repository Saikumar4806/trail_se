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

  window.alert = window.swalAlert;
})();