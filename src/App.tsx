import { useState, useEffect, useRef } from 'react';
import { MENU, SYS, WELCOME } from './data';

function hasAr(t: string) {
  return /[\u0600-\u06FF]/.test(t);
}

function getPrice(item: any) {
  if (item.price) return `${item.price} EGP`;
  if (item.prices) {
    const p = item.prices;
    const parts = [];
    if (p.S) parts.push(`S: ${p.S}`);
    if (p.D) parts.push(`D: ${p.D}`);
    if (p.M) parts.push(`M: ${p.M}`);
    if (p.L) parts.push(`L: ${p.L}`);
    if (parts.length === 1) return parts[0].split(': ')[1] + ' EGP';
    return parts.join(' · ') + ' EGP';
  }
  return '';
}

function getSizes(item: any) {
  if (item.prices) {
    const p = item.prices;
    const sizes = [];
    if (p.S) sizes.push('Single');
    if (p.D) sizes.push('Double');
    if (p.M) sizes.push('Medium');
    if (p.L) sizes.push('Large');
    if (sizes.length > 1) return sizes.join(' / ');
  }
  return '';
}

export default function App() {
  const [activeTab, setActiveTab] = useState(Object.keys(MENU)[0]);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  
  const msgsRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.12 });
    
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (chatOpen) {
      if (!welcomed) {
        setWelcomed(true);
        setMessages([{ role: 'assistant', content: WELCOME }]);
      }
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 200);
    }
  }, [chatOpen, welcomed]);

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const toggleChat = () => setChatOpen(!chatOpen);
  const openChat = () => setChatOpen(true);

  const cpSend = async (overrideText?: string) => {
    const t = (overrideText || inputText).trim();
    if (!t || isBusy) return;

    setIsBusy(true);
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: t }]);
    setIsTyping(true);

    try {
      const msgsForApi = messages
        .filter(m => !(m.role === 'assistant' && m.content === WELCOME))
        .concat({ role: 'user', content: t });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: msgsForApi
        })
      });

      let data: any;
      const resText = await res.text();
      try {
        data = JSON.parse(resText);
      } catch (parseEv) {
        throw new Error(`مشكلة في الاتصال بالخادم (HTTP ${res.status}). تأكد من إعداد الـ GEMINI_API_KEY بشكل صحيح.`);
      }

      setIsTyping(false);
      
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);

      const reply = data.content?.map((b: any) => b.text || '').join('') || '';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: `معلش، حصل خطأ 😅\n${e.message}\nحاول تاني أو كلم الكاشير.` }]);
    } finally {
      setIsBusy(false);
      textInputRef.current?.focus();
    }
  };

  return (
    <>
      <nav id="navbar" className={isScrolled ? 'scrolled' : ''}>
        <a className="nav-logo" href="#">
          <svg width="36" height="24" viewBox="0 0 93 60" fill="none">
            <rect x="4" y="4" width="34" height="52" rx="17" stroke="#C94B2A" strokeWidth="9"/>
            <rect x="55" y="4" width="34" height="52" rx="17" stroke="#C94B2A" strokeWidth="9"/>
          </svg>
          <div className="nav-logo-text">
            <h1>Double Zero</h1>
            <p>Specialty Cafe</p>
          </div>
        </a>
        <ul className="nav-links">
          <li><a href="#about">About</a></li>
          <li><a href="#menu">Menu</a></li>
          <li><a href="#experience">Experience</a></li>
        </ul>
        <button className="nav-cta" onClick={openChat}>Order Now ☕</button>
      </nav>

      <section id="hero">
        <div className="hero-bg"></div>
        <div className="hero-pattern"></div>
        <div className="hero-inner">
          <div className="hero-badge">Cairo's Finest Specialty Cafe</div>
          <h1 className="hero-title">Everything's<br/>Better <em>When It's</em><br/>Double.</h1>
          <p className="hero-sub">From single-origin espresso to artisan frappes — crafted for those who believe one cup is never enough.</p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => document.getElementById('menu')?.scrollIntoView({behavior: 'smooth'})}>Explore Menu</button>
            <button className="btn-outline text-sm leading-tight px-6" onClick={openChat}>☕ محتار تشرب إيه؟ اسأل Double Zero Barista AI</button>
          </div>
        </div>
        <div className="hero-scroll">
          <div className="scroll-line"></div>
          <span>Scroll</span>
        </div>
      </section>

      <section id="stats">
        <div className="stat reveal"><div className="stat-num">60<span>+</span></div><div className="stat-label">Menu Items</div></div>
        <div className="stat reveal"><div className="stat-num">14<span>+</span></div><div className="stat-label">Categories</div></div>
        <div className="stat reveal"><div className="stat-num">100<span>%</span></div><div className="stat-label">Made Fresh</div></div>
        <div className="stat reveal"><div className="stat-num">∞</div><div className="stat-label">Good Vibes</div></div>
      </section>

      <section id="about">
        <div className="about-visual reveal">
          <div className="about-card">
            <div className="about-card-quote">"We don't just make coffee.<br/>We craft moments worth doubling."</div>
            <div className="about-card-attr">— The Double Zero Manifesto</div>
            <div className="about-ring"></div>
            <div className="about-ring2"></div>
          </div>
        </div>
        <div className="about-text reveal">
          <div className="eyebrow">Our Story</div>
          <div className="about-divider"></div>
          <h2>Born from a love of extraordinary coffee</h2>
          <p>Double Zero was founded on a single belief: that the perfect cup deserves the perfect setting. We source the finest beans, pair them with exceptional craft, and serve them in an atmosphere that invites you to stay.</p>
          <p>From our signature hot beverages to indulgent frappes, milkshakes, waffles, and beyond — every item on our menu reflects our relentless pursuit of the double standard.</p>
        </div>
      </section>

      <section id="menu">
        <div className="section-header reveal">
          <div className="eyebrow">What We Serve</div>
          <h2>Our Menu</h2>
        </div>
        <div className="menu-tabs" id="menu-tabs">
          {Object.keys(MENU).map(cat => (
            <button 
              key={cat}
              className={`tab ${cat === activeTab ? 'active' : ''}`}
              onClick={() => setActiveTab(cat)}
            >
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="menu-grid" id="menu-grid">
          {MENU[activeTab].map((item: any, idx: number) => {
            const name = item.item.charAt(0) + item.item.slice(1).toLowerCase();
            const sizes = getSizes(item);
            return (
              <div key={idx} className="menu-item">
                <div className="menu-item-name">{name}</div>
                <div className="menu-item-price">{getPrice(item)}</div>
                {sizes && <div className="menu-item-sizes">{sizes}</div>}
              </div>
            );
          })}
        </div>
      </section>

      <section id="experience">
        <div className="exp-header reveal">
          <div className="eyebrow">Why Double Zero</div>
          <h2>The Double<br/>Experience</h2>
        </div>
        <div className="exp-grid">
          <div className="exp-card reveal">
            <div className="exp-icon">☕</div>
            <h3>Specialty Craft</h3>
            <p>Every drink is made to order by trained baristas who treat each cup as a canvas. No shortcuts, no compromises.</p>
          </div>
          <div className="exp-card reveal">
            <div className="exp-icon">🌍</div>
            <h3>Bilingual Welcome</h3>
            <p>Our team and our AI barista speak your language — Arabic, English, or anything in between. You're always home here.</p>
          </div>
          <div className="exp-card reveal">
            <div className="exp-icon">✨</div>
            <h3>Endless Options</h3>
            <p>With over 14 categories and 60+ items, from protein shakes to pistachio frappes, there's always something new to discover.</p>
          </div>
        </div>
      </section>

      <section id="ai-section">
        <div className="ai-inner reveal">
          <div className="eyebrow">Powered by AI</div>
          <h2>Meet Your<br/>Barista AI</h2>
          <p>Not sure what to order? Our bilingual AI barista knows the full menu, speaks Arabic and English, and is always ready to help you find your perfect match — 24/7.</p>
          <button className="btn-white" onClick={openChat}>Start Chatting ☕</button>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="36" height="24" viewBox="0 0 93 60" fill="none">
              <rect x="4" y="4" width="34" height="52" rx="17" stroke="#C94B2A" strokeWidth="9"/>
              <rect x="55" y="4" width="34" height="52" rx="17" stroke="#C94B2A" strokeWidth="9"/>
            </svg>
            <div className="logo-text"><h3>Double Zero</h3><p>Specialty Cafe</p></div>
          </div>
          <p className="tagline">Everything's better when it's Double. Find us in Cairo for the finest specialty coffee experience.</p>
        </div>
        <div className="footer-col">
          <h4>Menu</h4>
          <ul>
            <li><a href="#menu">Hot Beverages</a></li>
            <li><a href="#menu">Ice Beverages</a></li>
            <li><a href="#menu">Frappes</a></li>
            <li><a href="#menu">Milkshakes</a></li>
            <li><a href="#menu">Food</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Visit</h4>
          <ul>
            <li><a href="#">Cairo, Egypt</a></li>
            <li><a href="#">Hours: Daily 8am–2am</a></li>
            <li><a href="#">Dine In & Takeaway</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Connect</h4>
          <ul>
            <li><a href="#">Instagram</a></li>
            <li><a href="#">Facebook</a></li>
            <li><a href="#">TikTok</a></li>
          </ul>
        </div>
        <div className="footer-bottom">
          <p>© 2025 Double Zero. All rights reserved.</p>
          <p>Crafted with ☕ in Cairo</p>
        </div>
      </footer>

      <div id="chat-widget">
        <div id="chat-panel" className={chatOpen ? 'open' : ''}>
          <div className="cp-header">
            <svg width="32" height="21" viewBox="0 0 93 60" fill="none">
              <rect x="4" y="4" width="34" height="52" rx="17" stroke="#C94B2A" strokeWidth="9"/>
              <rect x="55" y="4" width="34" height="52" rx="17" stroke="#C94B2A" strokeWidth="9"/>
            </svg>
            <div><div className="name">Double Zero</div><div className="sub">Barista AI</div></div>
            <div className="cp-online"><div className="cp-dot"></div>Online</div>
          </div>
          
          <div id="cp-chat-screen" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="cp-msgs" id="cp-msgs" ref={msgsRef}>
                {messages.map((m, i) => (
                  <div key={i} className={`cp-row ${m.role === 'user' ? 'user' : ''}`}>
                    {m.role !== 'user' && <div className="cp-avatar">☕</div>}
                    <div className={`cp-bubble ${m.role === 'user' ? 'user' : 'bot'} ${hasAr(m.content) ? 'rtl' : ''}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="cp-row" id="cp-typing">
                    <div className="cp-avatar">☕</div>
                    <div className="cp-bubble bot">
                      <div className="cp-typing"><span></span><span></span><span></span></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="cp-chips" id="cp-chips">
                <button className="cp-chip" disabled={isBusy} onClick={() => cpSend("عايز قهوة")}>☕ قهوة</button>
                <button className="cp-chip" disabled={isBusy} onClick={() => cpSend("I want something iced")}>🧊 Iced</button>
                <button className="cp-chip" disabled={isBusy} onClick={() => cpSend("I want a frappe")}>🥤 Frappe</button>
                <button className="cp-chip" disabled={isBusy} onClick={() => cpSend("عايز أكل")}>🥐 أكل</button>
                <button className="cp-chip" disabled={isBusy} onClick={() => cpSend("I want boba")}>🧋 Boba</button>
                <button className="cp-chip" disabled={isBusy} onClick={() => cpSend("ايه أرخص حاجة؟")}>💰 أرخص حاجة</button>
              </div>
              <div className="cp-input">
                <input 
                  id="cp-txt" 
                  ref={textInputRef}
                  type="text" 
                  placeholder="What are you in the mood for? ☕"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cpSend()}
                />
                <button className="cp-send" id="cp-send" onClick={() => cpSend()} disabled={isBusy}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
        </div>
        <button id="chat-fab" onClick={toggleChat}>☕</button>
      </div>
    </>
  );
}
