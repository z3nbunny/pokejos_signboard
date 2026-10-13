export default function MenuSoldOutLabel({
    showSpanish = true
}) {
    return (
        <span className="inline-flex self-center align-middle shrink-0 items-center rounded-[0.2cqw] border border-white bg-white px-[0.25cqw] py-[0.08cqw] text-[0.48cqw] font-black uppercase leading-[1.15] text-black">
            SOLD OUT
            {showSpanish && ' · AGOTADO'}
        </span>
    );
}