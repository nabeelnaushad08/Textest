import logo from "@/assets/texpro-logo.png";

interface PrintLogoHeaderProps {
  /** Document title shown as the main heading (e.g. bill name) */
  title: string;
  contact?: string;
  /** Plain-text mode (dot matrix) hides the logo image */
  plain?: boolean;
}

export default function PrintLogoHeader({
  title,
  contact = "Naushad Zakeriya (0779484650)",
  plain = false,
}: PrintLogoHeaderProps) {
  return (
    <div className="print-logo-header">
      <style>{`
        .print-logo-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-align: center;
        }
        .print-logo-header img {
          height: 42px;
          width: auto;
          object-fit: contain;
        }
        .print-logo-header .plh-text { text-align: center; }
      `}</style>
      {!plain && <img src={logo} alt="TexPro Marketing logo" />}
      <div className="plh-text">
        <div className="company-name">{title}</div>
        <div className="company-contact">{contact}</div>
      </div>
    </div>
  );
}
