import { Icon, type IconName } from "@/components/shared/icon";

const steps: { number: string; title: string; text: string; icon: IconName }[] = [
  { number: "01", icon: "upload", title: "Upload securely", text: "Add a passport photo or PDF from any device. Files are encrypted before processing." },
  { number: "02", icon: "scan", title: "Extract instantly", text: "AI reads identity fields, validates the MRZ, and flags anything that needs a human check." },
  { number: "03", icon: "globe", title: "Match requirements", text: "See destination-specific visa requirements and prepare a complete application workspace." },
];

export function HowItWorks() {
  return <section className="landing-section how-section" id="how-it-works"><div className="section-heading centered"><span>How it works</span><h2>From passport to application<br />in three clear steps.</h2><p>Document intelligence takes care of repetitive work while you stay in control of every decision.</p></div><div className="steps-grid">{steps.map((step, index) => <article key={step.number}><div className="step-number">{step.number}</div><div className="step-icon"><Icon name={step.icon} /></div><h3>{step.title}</h3><p>{step.text}</p>{index < 2 && <span className="step-connector"><Icon name="arrow" /></span>}</article>)}</div></section>;
}
