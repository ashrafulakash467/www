export default function Image({
    alt = '',
    fill,
    priority,
    quality,
    sizes,
    style,
    ...props
}) {
    const fillStyles = fill
        ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
        : {};

    return <img alt={alt} sizes={sizes} style={{ ...fillStyles, ...style }} {...props} />;
}

