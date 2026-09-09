import MenuDisplayController from './MenuDisplayController';
import SidesMenuPreview from './SidesMenuPreview';

export default function SidesMenuDisplay({
    activeLocation,
    deviceId,
    previewMode = false
}) {
    return (
        <MenuDisplayController
            activeLocation={activeLocation}
            deviceId={deviceId}
            previewMode={previewMode}
            menuId="sides"
            menuLabel="Sides Menu"
            PreviewComponent={SidesMenuPreview}
        />
    );
}
