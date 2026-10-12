export default function MenuSoldOutLabel({
    showSpanish = true
}) {
    return (
        <span className="inline-flex self-center align-middle shrink-0 items-center rounded-[0.2cqw] border border-[#f4c542]/50 bg-[#f4c542]/10 px-[0.25cqw] py-[0.08cqw] text-[0.48cqw] font-black uppercase leading-[1.15] text-[#f4c542]">
            SOLD OUT
            {showSpanish && ' · AGOTADO'}
        </span>
    );
}