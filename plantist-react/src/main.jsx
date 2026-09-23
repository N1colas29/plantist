import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import {
    BrowserRouter,
    useNavigate,
    useLocation,
    Link,
    NavLink,
    Routes,
    Route,
} from "react-router-dom";
import "./style.css";

const api = async (path, options = {}) => {
    const r = await fetch(`/api${path}`, {
        credentials: "include",
        ...options,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Something went wrong.");
    return d;
};
const ageDays = (p) => {
    const platform = Math.max(
        0,
        Math.floor(
            (Date.now() - new Date(p.ageStartedAt).getTime()) / 86400000,
        ),
    );
    return { platform, total: Number(p.manuallyAddedAgeDays || 0) + platform };
};
const ageText = (d, u) =>
    u === "weeks"
        ? `${(d / 7).toFixed(1)} weeks`
        : u === "months"
          ? `${(d / 30.4375).toFixed(1)} months`
          : u === "years"
            ? `${(d / 365.25).toFixed(1)} years`
            : `${d} days`;

function Nav({ account, onLogout }) {
    const [open, setOpen] = useState(false);
    return (
        <header className="nav">
            <Link className="brand" to="/">
                plantist
            </Link>
            <nav className="nav-links">
                {account ? (
                    <button className="nav-account" onClick={onLogout}>
                        Sign out
                    </button>
                ) : (
                    <NavLink className="sign-in" to="/login">
                        Sign in
                    </NavLink>
                )}
                <NavLink to="/">Home</NavLink>
                <div className="nav-dropdown" 
                
                onMouseEnter={() => setOpen(open)}
                onMouseLeave={() => setOpen(!open)}>
                    <button
                        className="dropdown-button"
                    >
                        PLANTS
                    </button>
                    {open && (
                        <div className="dropdown-menu">
                            <Link to="/plants" onClick={() => setOpen(false)}>
                                Plant Profiles
                            </Link>
                            <Link to="/panel" onClick={() => setOpen(false)}>
                                Plant Panel
                            </Link>
                            <Link to="/protocol" onClick={() => setOpen(false)}>
                                Plant Protocol
                            </Link>
                        </div>
                    )}
                </div>
                <NavLink to="/about">About</NavLink>
                {account && <NavLink to="/account">Account</NavLink>}
            </nav>
        </header>
    );
}
function Layout({ account, setAccount, children }) {
    const nav = useNavigate();
    const logout = async () => {
        await api("/auth/logout", { method: "POST" });
        setAccount(null);
        nav("/");
    };
    return (
        <>
            <Nav account={account} onLogout={logout} />
            <main>{children}</main>
        </>
    );
}
function Home() {
    return (
        <>
            <section className="intro">
                <p className="eyebrow">welcome to plantist</p>
                <h1>what we do</h1>
                <p className="intro-copy">
                    track your plants, learn about our community, and discover new ways to care for your green friends.
                </p>
                <Link className="text-link" to="/plants">
                    explore plant profiles →
                </Link>
            </section>
            <section className="gallery">
                <div className="plant-card">image placeholder</div>
                <div className="plant-card tall">image placeholder</div>
                <div className="plant-card">image placeholder</div>
                <div className="plant-card wide">image placeholder</div>
            </section>
            <footer className="footer">insert contacts here later</footer>
        </>
    );
}
function About() {
    return (
        <section className="simple-page">
            <p className="eyebrow">about</p>
            <h1>plantist</h1>
            <p>About content can live here later.</p>
        </section>
    );
}
function Login({ setAccount }) {
    const [mode, setMode] = useState("signup"),
        [msg, setMsg] = useState(""),
        [busy, setBusy] = useState(false),
        nav = useNavigate();
    const submit = async (e) => {
        e.preventDefault();
        setMsg("");
        setBusy(true);
        try {
            const formElement = e.currentTarget; 
            const form = new FormData(formElement);
            const path = mode === "signup" ? "/auth/signup" : "/auth/login";
            const bodyOptions = mode === "signup" 
             ? { body: form }: { 
                  body: JSON.stringify(Object.fromEntries(form.entries())), 
                     headers: { "Content-Type": "application/json" } 
                   };

const d = await api(path, { method: "POST", ...bodyOptions });
            setAccount(d.account);
            setMsg(d.message);
            formElement.reset();
            setTimeout(() => nav("/account"), 700);
        } catch (x) {
            setMsg(x.message);
        } finally {
            setBusy(false);
        }
    };
    return (
        <section className="login-main">
            <div className="login-card">
                <p className="eyebrow">plantist</p>
                <h1>
                    {mode === "signup" ? "join us" : "welcome back"}
                </h1>
                <p className="form-note">
                    {mode === "signup"
                        ? "Create an account or sign in below."
                        : "Sign in to continue to plantist."}
                </p>
                <form onSubmit={submit}>
                    {mode === "signup" && (
                        <>
                            <label className="field">
                                <span>Profile picture</span>
                                <input
                                    name="profile"
                                    type="file"
                                    accept="image/*"
                                />
                            </label>
                            <label className="field">
                                <span>Name</span>
                                <input name="name" autoComplete="name" />
                            </label>
                        </>
                    )}
                    <label className="field">
                        <span>Username</span>
                        <input
                            name="username"
                            autoComplete="username"
                            required
                        />
                    </label>
                    <label className="field">
                        <span>Password</span>
                        <input
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                        />
                    </label>
                    <button className="submit-button" disabled={busy}>
                        {busy
                            ? "working..."
                            : mode === "signup"
                              ? "Create account"
                              : "Sign in"}
                    </button>
                </form>
                <button
                    className="switch-button"
                    onClick={() => {
                        setMode(mode === "signup" ? "login" : "signup");
                        setMsg("");
                    }}
                >
                    {mode === "signup"
                        ? "Already have an account? Sign in"
                        : "New here? Create an account"}
                </button>
                {msg && <p className="message">{msg}</p>}
                <Link className="back-home" to="/">
                    back to home
                </Link>
            </div>
        </section>
    );
}
function RequireLogin() {
    return (
        <section className="simple-page">
            <p className="eyebrow">your garden</p>
            <h1>log in first</h1>
            <p>You need an account to view and create plant profiles.</p>
            <Link className="button-link" to="/login">
                log in / create account
            </Link>
        </section>
    );
}
function Account({ account }) {
    if (!account) return <RequireLogin />;
    return (
        <section className="simple-page account-page">
            <p className="eyebrow">account</p>
            <h1>{account.name || account.username}</h1>
            <p className="muted">@{account.username}</p>
            <div className="account-grid">
                <div className="data-card">
                    <span>Plant Profiles</span>
                    <strong>{account["Plant Profiles"]?.length || 0}</strong>
                    <Link to="/plants">manage profiles →</Link>
                </div>
                <div className="data-card">
                    <span>Plant Protocols Scale</span>
                    <strong>
                        Level {account["Plant Protocols Scale"]?.level || 1}
                    </strong>
                    <Link to="/protocol">view protocol →</Link>
                </div>
                <div className="data-card">
                    <span>Plant Panel Items</span>
                    <strong>{account["Plant Panel Items"]?.length || 0}</strong>
                    <Link to="/panel">open panel →</Link>
                </div>
            </div>
        </section>
    );
}
function Plants({ account }) {
    const [plants, setPlants] = useState([]),
        [show, setShow] = useState(false),
        [err, setErr] = useState(""),
        [unit, setUnit] = useState("days"),
        [kind, setKind] = useState("total");
    useEffect(() => {
        if (account)
            api("/plants")
                .then((d) => setPlants(d.plants))
                .catch((e) => setErr(e.message));
    }, [account]);
    if (!account) return <RequireLogin />;
    const create = async (e) => {
        e.preventDefault();
        try {
            const d = await api("/plants", {
                method: "POST",
                body: new FormData(e.currentTarget),
            });
            setPlants((x) => [...x, d.plant]);
            formElement.reset();
            setShow(false);
        } catch (e) {
            setErr(e.message);
        }
    };
    return (
        <section className="content-page">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">your garden</p>
                    <h1>plant profiles</h1>
                </div>
                <button className="button-link" onClick={() => setShow(!show)}>
                    {show ? "close" : "+ new plant"}
                </button>
            </div>
            {show && (
                <form className="plant-form" onSubmit={create}>
                    <div className="form-columns">
                        <label className="field">
                            <span>Add name</span>
                            <input name="name" required />
                        </label>
                        <label className="field">
                            <span>Add species type</span>
                            <input name="speciesType" />
                        </label>
                    </div>
                    <label className="field">
                        <span>Add description</span>
                        <textarea name="description" rows="4" />
                    </label>
                    <label className="field">
                        <span>Starting age in days</span>
                        <input
                            name="manuallyAddedAgeDays"
                            type="number"
                            min="0"
                            defaultValue="0"
                        />
                    </label>
                    <div className="form-columns">
                        <label className="field">
                            <span>Color</span>
                            <input name="color" />
                        </label>
                        <label className="field">
                            <span>Size</span>
                            <input name="size" />
                        </label>
                    </div>
                    <label className="field">
                        <span>Additional specs</span>
                        <textarea
                            name="otherSpecs"
                            rows="3"
                            placeholder="soil, light, pot, notes..."
                        />
                    </label>
                    <label className="field">
                        <span>Add image(s)</span>
                        <input
                            name="images"
                            type="file"
                            accept="image/*"
                            multiple
                        />
                    </label>
                    <button className="submit-button">
                        create plant profile
                    </button>
                </form>
            )}
            {err && <p className="error">{err}</p>}
            <div className="age-controls">
                <span>Show:</span>
                <button
                    className={kind === "total" ? "selected" : ""}
                    onClick={() => setKind("total")}
                >
                    total age
                </button>
                <button
                    className={kind === "platform" ? "selected" : ""}
                    onClick={() => setKind("platform")}
                >
                    age on platform
                </button>
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                    <option value="months">months</option>
                    <option value="years">years</option>
                </select>
            </div>
            {plants.length === 0 ? (
                <div className="empty-state">No plant profiles yet.</div>
            ) : (
                <div className="plant-list">
                    {plants.map((p) => {
                        const a = ageDays(p),
                            d = kind === "platform" ? a.platform : a.total;
                        return (
                            <article className="plant-profile" key={p.id}>
                                <div className="plant-image">
                                    {p.images?.[0] ? (
                                        <img
                                            src={p.images[0].url}
                                            alt={p.name}
                                        />
                                    ) : (
                                        <span>image placeholder</span>
                                    )}
                                </div>
                                <div className="plant-info">
                                    <p className="eyebrow">
                                        {p.speciesType || "plant"}
                                    </p>
                                    <h2>{p.name}</h2>
                                    <p>
                                        {p.description || "No description yet."}
                                    </p>
                                    <div className="plant-meta">
                                        <span>
                                            <b>Age</b>
                                            {ageText(d, unit)}
                                        </span>
                                        <span>
                                            <b>Color</b>
                                            {p.additionalSpecs?.color || "—"}
                                        </span>
                                        <span>
                                            <b>Size</b>
                                            {p.additionalSpecs?.size || "—"}
                                        </span>
                                    </div>
                                    <details>
                                        <summary>timeline & images</summary>
                                        {p.timeline?.map((t) => (
                                            <div
                                                className="timeline-row"
                                                key={t.imageId}
                                            >
                                                {new Date(
                                                    t.date,
                                                ).toLocaleDateString()}{" "}
                                                — {t.note}
                                            </div>
                                        ))}
                                    </details>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
function Panel({ account }) {
    const [items, setItems] = useState([]);
    useEffect(() => {
        if (account) api("/panel").then((d) => setItems(d.items));
    }, [account]);
    if (!account) return <RequireLogin />;
    const add = async (e) => {
        e.preventDefault();
        const d = await api("/panel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
                Object.fromEntries(new FormData(e.currentTarget)),
            ),
        });
        setItems((x) => [...x, d.item]);
        e.currentTarget.reset();
    };
    return (
        <section className="content-page">
            <p className="eyebrow">your garden</p>
            <h1>plant panel</h1>
            <p className="intro-copy small">
                A simple place for items you want to keep close.
            </p>
            <form className="inline-form" onSubmit={add}>
                <input name="title" placeholder="panel item" required />
                <input name="note" placeholder="note" />
                <button className="button-link">add</button>
            </form>
            <div className="panel-list">
                {items.map((i) => (
                    <div className="panel-item" key={i.id}>
                        <strong>{i.title}</strong>
                        <span>{i.note}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
function Protocol({ account }) {
    const [level, setLevel] = useState(1),
        [notes, setNotes] = useState(""),
        [msg, setMsg] = useState("");
    useEffect(() => {
        if (account)
            api("/protocols").then((d) => {
                setLevel(d.protocols.level || 1);
                setNotes(d.protocols.notes || "");
            });
    }, [account]);
    if (!account) return <RequireLogin />;
    const save = async () => {
        const d = await api("/protocols", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level, notes }),
        });
        setLevel(d.protocols.level);
        setNotes(d.protocols.notes);
        setMsg("saved.");
    };
    return (
        <section className="content-page narrow">
            <p className="eyebrow">your garden</p>
            <h1>plant protocol</h1>
            <p className="intro-copy small">
                A deliberately simple scale for your own plant-care system.
            </p>
            <label className="field">
                <span>Protocol scale — level {level}</span>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                />
            </label>
            <label className="field">
                <span>Notes</span>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="7"
                />
            </label>
            <button className="button-link" onClick={save}>
                save protocol
            </button>
            {msg && <span className="saved">{msg}</span>}
        </section>
    );
}
function App() {
    const [account, setAccount] = useState(null),
        [loading, setLoading] = useState(true),
        loc = useLocation();
    useEffect(() => {
        api("/auth/me")
            .then((d) => setAccount(d.account))
            .catch(() => setAccount(null))
            .finally(() => setLoading(false));
    }, [loc.pathname]);
    if (loading) return <div className="loading">plantist</div>;
    return (
        <Layout account={account} setAccount={setAccount}>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/home" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route
                    path="/login"
                    element={<Login setAccount={setAccount} />}
                />
                <Route
                    path="/account"
                    element={<Account account={account} />}
                />
                <Route path="/plants" element={<Plants account={account} />} />
                <Route path="/panel" element={<Panel account={account} />} />
                <Route
                    path="/protocol"
                    element={<Protocol account={account} />}
                />
            </Routes>
        </Layout>
    );
}
ReactDOM.createRoot(document.getElementById("root")).render(
    <BrowserRouter>
        <App />
    </BrowserRouter>,
);
