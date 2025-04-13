export const createHTMLImage = (src, size) => {
    const img = document.createElement('img');
    img.src = src;
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    img.style.transform = 'translate(-50%, -50%)';
    img.className = 'joystick-asset';
    return img;
}

export const createHTMLSvg = (src, size) => {
    const div = document.createElement('div');
    div.innerHTML = src;
    div.style.width = `${size}px`;
    div.style.height = `${size}px`;
    div.style.transform = 'translate(-50%, -50%)';
    div.className = 'joystick-asset';
    return div;
}
