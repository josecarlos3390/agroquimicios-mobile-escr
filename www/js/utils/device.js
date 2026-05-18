export async function getModeloDispositivo({ maxLength = 10, fallback = 'LOCAL' } = {}) {
  try {
    if (window.Capacitor?.Plugins?.Device) {
      const info = await window.Capacitor.Plugins.Device.getInfo();
      return info.model
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, maxLength);
    }

    const match = navigator.userAgent.match(/\(.*?;\s*([^;)]+)\s*Build/);
    if (match?.[1]) {
      return match[1]
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, maxLength);
    }

    return fallback;
  } catch {
    return fallback;
  }
}
