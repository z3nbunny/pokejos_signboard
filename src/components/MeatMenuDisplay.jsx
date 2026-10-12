import MenuDisplayController from './MenuDisplayController';
import MeatMenuPreview from './MeatMenuPreview';

export default function MeatMenuDisplay({
    activeLocation,
    deviceId,
    previewMode = false
}) {
    return (
        <MenuDisplayController
            activeLocation={activeLocation}
            deviceId={deviceId}
            previewMode={previewMode}
            menuId="meat"
            menuLabel="Meat Menu"
            PreviewComponent={MeatMenuPreview}
        />
    );
}