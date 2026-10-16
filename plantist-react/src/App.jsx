import React, { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { supabase, uploadFile } from "./supabase";
import "./style.css";
import "./protocol.css";

const ageDays = (plant) => {
  const start = plant.age_started_at || plant.ageStartedAt || plant.created_at || new Date().toISOString();
  const platform = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86400000));
  return { platform, total: Number(plant.manually_added_age_days ?? plant.manuallyAddedAgeDays ?? 0) + platform };
};
const ageText = (days, unit) => unit === "weeks" ? `${(days / 7).toFixed(1)} weeks` : unit === "months" ? `${(days / 30.4375).toFixed(1)} months` : unit === "years" ? `${(days / 365.25).toFixed(1)} years` : `${days} days`;
const messageOf = (error) => error?.message || "Something went wrong. Please try again.";

async function getAccount(user) {
  if (!user) return null;
  const { data, error } = await supabase.from("accounts").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data || { id: user.id, username: user.user_metadata?.username || user.email?.split("@")[0] || "grower", name: user.user_metadata?.name || "", email: user.email };
}

function Nav({ account, onLogout }) {
  const [open, setOpen] = useState(false);
  return <header className="nav">
    <Link className="brand" to="/">plantist</Link>
    <nav className="nav-links">
      {account ? <button className="nav-account" onClick={onLogout}>Sign out</button> : <NavLink className="sign-in" to="/login">Sign in</NavLink>}
      <NavLink to="/">Home</NavLink>
      <div className="nav-dropdown" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <button className="dropdown-button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>PLANTS</button>
        {open && <div className="dropdown-menu">
          <Link to="/plants" onClick={() => setOpen(false)}>Plant Profiles</Link>
          <Link to="/panel" onClick={() => setOpen(false)}>Plant Panel</Link>
          <Link to="/protocol" onClick={() => setOpen(false)}>Plant Protocol</Link>
        </div>}
      </div>
      <NavLink to="/about">About</NavLink>
      {account && <NavLink to="/account">Account</NavLink>}
    </nav>
  </header>;
}

function Layout({ account, setAccount, children }) {
  const navigate = useNavigate();
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return window.alert(messageOf(error));
    setAccount(null);
    navigate("/");
  };
  return <><Nav account={account} onLogout={logout} /><main>{children}</main></>;
}

function Home() {
  return <>
    <section className="intro">
      <p className="eyebrow">welcome to plantist</p>
      <h1>what we do</h1>
      <p className="intro-copy">track your plants, learn about our community, and discover new ways to care for your green friends.</p>
      <Link className="text-link" to="/plants">explore plant profiles →</Link>
    </section>
    <section className="gallery">
      <div className="plant-card">image placeholder</div>
      <div className="plant-card tall">image placeholder</div>
      <div className="plant-card">image placeholder</div>
      <div className="plant-card wide">image placeholder</div>
    </section>
    <footer className="footer">insert contacts here later</footer>
  </>;
}
function About() { return <section className="simple-page"><p className="eyebrow">about</p><h1>plantist</h1><p>About content can live here later.</p></section>; }

function Login({ setAccount }) {
  const [mode, setMode] = useState("signup");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault(); setMsg(""); setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    try {
      if (mode === "signup") {
        const email = String(form.get("email") || "").trim();
        if (!email) throw new Error("Enter an email address to create an account.");
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username, name: String(form.get("name") || "").trim() } } });
        if (error) throw error;
        if (data.user && data.session) {
          const profileFile = form.get("profile");
          if (profileFile instanceof File && profileFile.size > 0) {
            const uploaded = await uploadFile(profileFile, "profile", data.user.id);
            const { error: profileError } = await supabase.from("accounts").update({ profile_image: uploaded.url }).eq("id", data.user.id);
            if (profileError) throw profileError;
          }
          const profile = await getAccount(data.user); setAccount(profile); setMsg("Account created."); formElement.reset(); setTimeout(() => navigate("/account"), 500);
        } else {
          setMsg("Check your email to confirm your account, then sign in.");
        }
      } else {
        const email = String(form.get("email") || "").trim();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAccount(await getAccount(data.user)); formElement.reset(); navigate("/account");
      }
    } catch (error) { setMsg(messageOf(error)); }
    finally { setBusy(false); }
  };
  return <section className="login-main"><div className="login-card">
    <p className="eyebrow">plantist</p><h1>{mode === "signup" ? "join us" : "welcome back"}</h1>
    <p className="form-note">{mode === "signup" ? "Create an account or sign in below." : "Sign in to continue to plantist."}</p>
    <form onSubmit={submit}>
      {mode === "signup" && <><label className="field"><span>Profile picture</span><input name="profile" type="file" accept="image/*" /></label><label className="field"><span>Name</span><input name="name" autoComplete="name" /></label><label className="field"><span>Username</span><input name="username" autoComplete="username" required /></label></>}
      <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
      <label className="field"><span>Password</span><input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required /></label>
      <button className="submit-button" disabled={busy}>{busy ? "working..." : mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
    <button className="switch-button" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMsg(""); }}>{mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}</button>
    {msg && <p className="message">{msg}</p>}<Link className="back-home" to="/">back to home</Link>
  </div></section>;
}
function RequireLogin() { return <section className="simple-page"><p className="eyebrow">your garden</p><h1>log in first</h1><p>You need an account to view and create plant profiles.</p><Link className="button-link" to="/login">log in / create account</Link></section>; }

function Account({ account }) {
  const [counts, setCounts] = useState({ plants: 0, posts: 0, level: 1 });
  useEffect(() => { if (!account) return; let alive = true; (async () => {
    const [plants, posts, protocol] = await Promise.all([
      supabase.from("plants").select("id", { count: "exact", head: true }).eq("account_id", account.id),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("account_id", account.id),
      supabase.from("plant_protocols").select("level").eq("account_id", account.id).maybeSingle()
    ]);
    if (alive) setCounts({ plants: plants.count || 0, posts: posts.count || 0, level: protocol.data?.level || 1 });
  })(); return () => { alive = false; }; }, [account]);
  if (!account) return <RequireLogin />;
  return <section className="simple-page account-page"><p className="eyebrow">account</p><h1>{account.name || account.username}</h1><Link to="/edit" className="edit-link">@{account.username} →</Link>
    <div className="account-grid"><div className="data-card"><span>Plant Profiles</span><strong>{counts.plants}</strong><Link to="/plants">manage profiles →</Link></div><div className="data-card"><span>Plant Protocols</span><strong>Level {counts.level}</strong><Link to="/protocol">view protocol →</Link></div><div className="data-card"><span>Plant Panel Items</span><strong>{counts.posts}</strong><Link to="/panel">open panel →</Link></div></div>
  </section>;
}

function EditAccount({ account, setAccount }) {
  const [name, setName] = useState(account?.name || "");
  const [username, setUsername] = useState(account?.username || "");
  const [msg, setMsg] = useState("");
  useEffect(() => { setName(account?.name || ""); setUsername(account?.username || ""); }, [account]);
  if (!account) return <RequireLogin />;
  const submit = async (event) => { event.preventDefault(); setMsg("");
    const cleanUsername = username.trim();
    if (!cleanUsername) return setMsg("Username is required.");
    const { data, error } = await supabase.from("accounts").update({ name: name.trim(), username: cleanUsername }).eq("id", account.id).select().single();
    if (error) return setMsg(messageOf(error));
    setAccount({ ...account, ...data }); setMsg("Changes saved.");
  };
  return <section className="simple-page edit-account-page"><p className="eyebrow">edit account</p><h1>Edit Your Profile</h1><form onSubmit={submit}>
    <label className="field"><span>Name</span><input type="text" value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label className="field"><span>Username</span><input type="text" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
    <button className="submit-button" type="submit">Save Changes</button>
  </form>{msg && <p className="message">{msg}</p>}</section>;
}

function Plants({ account }) {
  const [plants, setPlants] = useState([]); const [show, setShow] = useState(false); const [err, setErr] = useState(""); const [unit, setUnit] = useState("days"); const [kind, setKind] = useState("total"); const [busy, setBusy] = useState(false);
  const load = async () => { if (!account) return; const { data, error } = await supabase.from("plants").select("*").eq("account_id", account.id).order("created_at", { ascending: false }); if (error) setErr(messageOf(error)); else setPlants(data || []); };
  useEffect(() => { load(); }, [account?.id]);
  if (!account) return <RequireLogin />;
  const create = async (event) => { event.preventDefault(); setErr(""); setBusy(true); const formElement = event.currentTarget; const form = new FormData(formElement);
    try {
      const files = form.getAll("images").filter((file) => file instanceof File && file.size > 0);
      const images = []; for (const file of files) { const uploaded = await uploadFile(file, "plants", account.id); if (uploaded) images.push(uploaded); }
      const color = String(form.get("color") || ""); const size = String(form.get("size") || "");
      const payload = { account_id: account.id, name: String(form.get("name") || "").trim(), species_type: String(form.get("speciesType") || "").trim(), description: String(form.get("description") || "").trim(), manually_added_age_days: Number(form.get("manuallyAddedAgeDays") || 0), age_started_at: new Date().toISOString(), color, size, other_specs: String(form.get("otherSpecs") || "").trim(), images, timeline: images.map((image) => ({ imageId: image.path, date: new Date().toISOString(), note: "Added at profile creation" })) };
      const { error } = await supabase.from("plants").insert(payload); if (error) throw error;
      formElement.reset(); setShow(false); await load();
    } catch (error) { setErr(messageOf(error)); } finally { setBusy(false); }
  };
  const removePlant = async (id) => { if (!window.confirm("Delete this plant profile?")) return; const { error } = await supabase.from("plants").delete().eq("id", id).eq("account_id", account.id); if (error) setErr(messageOf(error)); else setPlants((items) => items.filter((plant) => plant.id !== id)); };
  return <section className="content-page"><div className="page-heading"><div><p className="eyebrow">your garden</p><h1>plant profiles</h1></div><button className="button-link" onClick={() => setShow(!show)}>{show ? "cancel" : "+ new plant"}</button></div>
    {show && <form className="plant-form" onSubmit={create}><div className="form-columns"><label className="field"><span>Add name</span><input name="name" required /></label><label className="field"><span>Add species type</span><input name="speciesType" /></label></div>
      <label className="field"><span>Add description</span><textarea name="description" rows="4" /></label><label className="field"><span>Starting age in days</span><input name="manuallyAddedAgeDays" type="number" min="0" defaultValue="0" /></label>
      <div className="form-columns"><label className="field"><span>Color</span><input name="color" /></label><label className="field"><span>Size</span><input name="size" /></label></div>
      <label className="field"><span>Additional specs</span><textarea name="otherSpecs" rows="3" placeholder="soil, light, pot, notes..." /></label><label className="field"><span>Add image(s)</span><input name="images" type="file" accept="image/*" multiple /></label><button className="submit-button" disabled={busy}>{busy ? "saving..." : "create plant profile"}</button>
    </form>}
    {err && <p className="error">{err}</p>}<div className="age-controls"><span>Show:</span><button className={kind === "total" ? "selected" : ""} onClick={() => setKind("total")}>total age</button><button className={kind === "platform" ? "selected" : ""} onClick={() => setKind("platform")}>age on platform</button><select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="days">days</option><option value="weeks">weeks</option><option value="months">months</option><option value="years">years</option></select></div>
    {plants.length === 0 ? <div className="empty-state">No plant profiles yet.</div> : <div className="plant-list">{plants.map((plant) => { const age = ageDays(plant); const days = kind === "platform" ? age.platform : age.total; const images = plant.images || []; return <article className="plant-profile" key={plant.id}>
      <div className="plant-image">{images[0]?.url ? <img src={images[0].url} alt={plant.name} /> : <span>image placeholder</span>}</div><div className="plant-info"><p className="eyebrow">{plant.species_type || "plant"}</p><h2>{plant.name}</h2><p>{plant.description || "No description yet."}</p><div className="plant-meta"><span><b>Age</b>{ageText(days, unit)}</span><span><b>Color</b>{plant.color || "—"}</span><span><b>Size</b>{plant.size || "—"}</span></div><details><summary>timeline &amp; images</summary>{(plant.timeline || []).map((item) => <div className="timeline-row" key={item.imageId}>{new Date(item.date).toLocaleDateString()} — {item.note}</div>)}{images.map((image) => <div className="timeline-row" key={image.path}><a href={image.url} target="_blank" rel="noreferrer">{image.filename || "View image"}</a></div>)}</details><p><button className="reply-button" onClick={() => removePlant(plant.id)}>delete profile</button></p></div>
    </article>; })}</div>}
  </section>;
}

function PlantPanel({ account }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);

  const loadPosts = async () => {
    if (!account) return;
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("posts")
      .select("*, author:accounts!posts_account_id_fkey(username, name), replies(*, author:accounts!replies_account_id_fkey(username, name))")
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(messageOf(loadError));
      setPosts([]);
    } else {
      setPosts((data || []).map((post) => ({
        ...post,
        createdAt: post.created_at,
        attachment: post.attachment_url ? { url: post.attachment_url, filename: post.attachment_name, mimeType: post.attachment_type } : null,
        replies: (post.replies || [])
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          .map((reply) => ({
            ...reply,
            createdAt: reply.created_at,
            attachment: reply.attachment_url ? { url: reply.attachment_url, filename: reply.attachment_name, mimeType: reply.attachment_type } : null,
          })),
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!account) { setLoading(false); return; }
    loadPosts();
    const channel = supabase.channel("plant-panel-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, loadPosts)
      .on("postgres_changes", { event: "*", schema: "public", table: "replies" }, loadPosts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [account?.id]);

  if (!account) return <RequireLogin />;

  const createPost = async (event) => {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    try {
      const file = formData.get("file");
      const attachment = file instanceof File && file.size ? await uploadFile(file, "forum", account.id) : null;
      const { error: insertError } = await supabase.from("posts").insert({
        account_id: account.id,
        title: String(formData.get("title") || "").trim(),
        body: String(formData.get("body") || "").trim(),
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.filename || null,
        attachment_type: attachment?.mimeType || null,
      });
      if (insertError) throw insertError;
      formElement.reset();
      setShowPostForm(false);
      await loadPosts();
    } catch (createError) { setError(messageOf(createError)); }
  };

  const createReply = async (postId, formElement) => {
    setError("");
    const formData = new FormData(formElement);
    try {
      const file = formData.get("file");
      const attachment = file instanceof File && file.size ? await uploadFile(file, "forum", account.id) : null;
      const { error: insertError } = await supabase.from("replies").insert({
        post_id: postId,
        account_id: account.id,
        title: String(formData.get("title") || "").trim(),
        body: String(formData.get("body") || "").trim(),
        attachment_url: attachment?.url || null,
        attachment_name: attachment?.filename || null,
        attachment_type: attachment?.mimeType || null,
      });
      if (insertError) throw insertError;
      formElement.reset();
      await loadPosts();
    } catch (createError) { setError(messageOf(createError)); }
  };

  return (
    <section className="content-page forum-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">community garden</p>
          <h1>plant panel</h1>
          <p className="intro-copy small">Ask questions, share observations, and keep conversations about plants in one place.</p>
        </div>
        <button className="button-link" onClick={() => setShowPostForm(!showPostForm)}>{showPostForm ? "close" : "+ new post"}</button>
      </div>
      {showPostForm && (
        <form className="forum-form" onSubmit={createPost}>
          <p className="eyebrow">new discussion</p>
          <label className="field"><span>Title</span><input name="title" type="text" placeholder="What would you like to discuss?" required /></label>
          <label className="field"><span>Body</span><textarea name="body" rows="7" placeholder="Write your post..." required /></label>
          <label className="field"><span>Optional file</span><input name="file" type="file" accept="image/*,.pdf,.txt,.doc,.docx" /></label>
          <button className="submit-button">publish post</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="empty-state">loading the panel...</div>
      ) : posts.length === 0 ? (
        <div className="empty-state"><p>No discussions yet.</p><button className="button-link" onClick={() => setShowPostForm(true)}>start the first one</button></div>
      ) : (
        <div className="forum-list">{posts.map((post) => <ForumPost key={post.id} post={post} account={account} onReply={createReply} />)}</div>
      )}
    </section>
  );
}

function ForumPost({ post, account, onReply }) {
  const [replyOpen, setReplyOpen] = useState(false);
  return <article className="forum-post"><header className="forum-post-header"><div><p className="eyebrow">@{post.author?.username || "grower"}</p><h2>{post.title}</h2></div><time>{new Date(post.createdAt).toLocaleDateString()}</time></header><div className="forum-post-body"><p>{post.body}</p>{post.attachment && <ForumAttachment attachment={post.attachment} />}</div>
    <div className="forum-post-footer"><span>{post.replies?.length || 0} {post.replies?.length === 1 ? "reply" : "replies"}</span><button className="reply-button" onClick={() => setReplyOpen(!replyOpen)}>{replyOpen ? "close" : "reply"}</button></div>
    {post.replies?.length > 0 && <div className="reply-list">{post.replies.map((reply) => <article className="forum-reply" key={reply.id}><div className="reply-heading"><div><p className="eyebrow">@{reply.author?.username || "grower"}</p><h3>{reply.title}</h3></div><time>{new Date(reply.createdAt || reply.created_at).toLocaleDateString()}</time></div><p>{reply.body}</p>{reply.attachment && <ForumAttachment attachment={reply.attachment} />}</article>)}</div>}
    {replyOpen && <form className="reply-form" onSubmit={(event) => { event.preventDefault(); const element = event.currentTarget; onReply(post.id, element).then(() => setReplyOpen(false)); }}><p className="eyebrow">reply as @{account.username}</p><label className="field"><span>Title</span><input name="title" type="text" placeholder="Reply title" required /></label><label className="field"><span>Body</span><textarea name="body" rows="5" placeholder="Write your reply..." required /></label><label className="field"><span>Optional file</span><input name="file" type="file" accept="image/*,.pdf,.txt,.doc,.docx" /></label><button className="submit-button">publish reply</button></form>}
  </article>;
}
function ForumAttachment({ attachment }) {
  if (attachment.mimeType?.startsWith("image/")) return <div className="forum-attachment image-attachment"><img src={attachment.url} alt={attachment.filename || "Attached image"} /><a href={attachment.url} target="_blank" rel="noreferrer">{attachment.filename || "open image"}</a></div>;
  return <div className="forum-attachment"><a href={attachment.url} target="_blank" rel="noreferrer">open {attachment.filename || "attachment"}</a></div>;
}
const PROTOCOL_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "into", "is", "it", "of", "on", "or", "the", "to", "with", "your", "you", "plant", "plants", "guide", "notes"
]);

function titleKeywords(title) {
  return new Set(String(title || "").toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/)
    .filter((word) => word.length > 2 && !PROTOCOL_STOP_WORDS.has(word)));
}

function recommendationGroup(article, articles, ratings) {
  const ownKeywords = titleKeywords(article.title);
  let matchesHigh = false;
  let matchesLow = false;
  for (const other of articles) {
    if (other.id === article.id) continue;
    const rating = ratings[other.id];
    if (rating !== 4 && rating !== 5 && rating !== 1 && rating !== 2) continue;
    const otherKeywords = titleKeywords(other.title);
    const overlaps = [...ownKeywords].some((word) => otherKeywords.has(word));
    if (!overlaps) continue;
    if (rating >= 4) matchesHigh = true;
    if (rating <= 2) matchesLow = true;
  }
  // A title that overlaps both a high- and low-rated title remains neutral.
  if (matchesHigh && matchesLow) return 1;
  if (matchesHigh) return 0;
  if (matchesLow) return 2;
  return 1;
}

const emptyArticleForm = (account) => ({
  title: "", author: account?.name || account?.username || "", published_on: new Date().toISOString().slice(0, 10),
  source_url: "", summary: "", sections: [{ heading: "Overview", body: "" }]
});

function Protocol({ account }) {
  const [articles, setArticles] = useState([]);
  const [ratings, setRatings] = useState({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recommended");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyArticleForm(account));
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const loadArticles = async () => {
    setLoading(true);
    setError("");
    const { data, error: articleError } = await supabase.from("protocol_articles").select("*").order("published_on", { ascending: false }).order("created_at", { ascending: false });
    if (articleError) {
      setError(`${messageOf(articleError)} If this is a new Supabase project, run the updated supabase/schema.sql file first.`);
      setArticles([]);
      setLoading(false);
      return;
    }
    setArticles(data || []);
    if (account) {
      const { data: ratingRows, error: ratingError } = await supabase.from("protocol_article_ratings").select("article_id, rating").eq("account_id", account.id);
      if (ratingError) setError(messageOf(ratingError));
      else setRatings(Object.fromEntries((ratingRows || []).map((row) => [row.article_id, row.rating])));
    } else setRatings({});
    setLoading(false);
  };

  useEffect(() => { loadArticles(); }, [account?.id]);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const openNewForm = () => { setEditingId(null); setForm(emptyArticleForm(account)); setShowForm(true); };
  const openEditForm = (article) => {
    setEditingId(article.id);
    setForm({ title: article.title || "", author: article.author || "", published_on: article.published_on || "", source_url: article.source_url || "", summary: article.summary || "", sections: Array.isArray(article.sections) && article.sections.length ? article.sections : [{ heading: "Overview", body: "" }] });
    setShowForm(true);
    window.scrollTo(0, 0);
  };
  const saveArticle = async (event) => {
    event.preventDefault();
    if (!account) { setError("Sign in to add or edit articles."); return; }
    setBusy(true); setError("");
    const payload = {
      title: form.title.trim(), author: form.author.trim(), published_on: form.published_on || new Date().toISOString().slice(0, 10),
      source_url: form.source_url.trim() || null, summary: form.summary.trim(), sections: form.sections.map((section) => ({ heading: section.heading.trim(), body: section.body.trim() })).filter((section) => section.heading || section.body)
    };
    try {
      if (!payload.title) throw new Error("Add an article title.");
      if (payload.source_url && !/^https?:\/\//i.test(payload.source_url)) throw new Error("The source link must start with http:// or https://.");
      if (payload.sections.length === 0) throw new Error("Add at least one section.");
      let result;
      if (editingId) result = await supabase.from("protocol_articles").update(payload).eq("id", editingId).eq("created_by", account.id);
      else result = await supabase.from("protocol_articles").insert({ ...payload, created_by: account.id });
      if (result.error) throw result.error;
      setShowForm(false); setEditingId(null); setForm(emptyArticleForm(account)); await loadArticles();
    } catch (saveError) { setError(messageOf(saveError)); }
    finally { setBusy(false); }
  };
  const deleteArticle = async (article) => {
    if (!window.confirm(`Delete “${article.title}”? This cannot be undone.`)) return;
    const { error: deleteError } = await supabase.from("protocol_articles").delete().eq("id", article.id).eq("created_by", account.id);
    if (deleteError) setError(messageOf(deleteError)); else { setArticles((current) => current.filter((item) => item.id !== article.id)); setRatings((current) => { const next = { ...current }; delete next[article.id]; return next; }); }
  };
  const rateArticle = async (articleId, rating) => {
    if (!account) { setError("Sign in to save personal ratings."); return; }
    setError("");
    const { error: ratingError } = await supabase.from("protocol_article_ratings").upsert({ article_id: articleId, account_id: account.id, rating, updated_at: new Date().toISOString() }, { onConflict: "article_id,account_id" });
    if (ratingError) setError(messageOf(ratingError)); else setRatings((current) => ({ ...current, [articleId]: rating }));
  };

  const query = search.trim().toLowerCase();
  const visibleArticles = articles.filter((article) => {
    const sectionText = (article.sections || []).map((section) => `${section.heading || ""} ${section.body || ""}`).join(" ");
    return !query || `${article.title} ${article.author} ${article.summary} ${sectionText}`.toLowerCase().includes(query);
  }).sort((a, b) => {
    if (sort === "newest") return String(b.published_on || b.created_at).localeCompare(String(a.published_on || a.created_at));
    if (sort === "oldest") return String(a.published_on || a.created_at).localeCompare(String(b.published_on || b.created_at));
    if (sort === "title") return a.title.localeCompare(b.title);
    const groupDiff = recommendationGroup(a, articles, ratings) - recommendationGroup(b, articles, ratings);
    if (groupDiff) return groupDiff;
    return String(b.published_on || b.created_at).localeCompare(String(a.published_on || a.created_at));
  });

  return <section className="content-page protocol-page">
    <div className="page-heading protocol-heading"><div><p className="eyebrow">learn, grow, and have fun!</p><h1>plant protocols</h1><p className="intro-copy small">A growing library of plant-care articles, research, and practical notes.</p></div>{account && <button className="button-link" onClick={() => showForm ? setShowForm(false) : openNewForm()}>{showForm ? "close" : "+ new article"}</button>}</div>
    <div className="protocol-tools"><label className="field protocol-search"><span>Search articles</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles, authors, or article text..." /></label><label className="field protocol-sort"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></label></div>
    <p className="protocol-explainer">Recommended sorting uses your private ratings: articles related by title keywords to 4–5 star articles appear first, and those related to 1–2 star articles appear last. If an article matches both groups, it stays neutral. Other visitors cannot see your ratings.</p>
    {error && <p className="error">{error}</p>}
    {showForm && account && <form className="plant-form protocol-form" onSubmit={saveArticle}>
      <p className="eyebrow">{editingId ? "edit article" : "article template"}</p><h2>{editingId ? "Update article" : "Add a plant protocol"}</h2>
      <label className="field"><span>Title</span><input value={form.title} onChange={(event) => updateForm("title", event.target.value)} required maxLength={240} placeholder="Article title" /></label>
      <div className="form-columns"><label className="field"><span>Author</span><input value={form.author} onChange={(event) => updateForm("author", event.target.value)} placeholder="Author or organization" /></label><label className="field"><span>Publication date</span><input type="date" value={form.published_on} onChange={(event) => updateForm("published_on", event.target.value)} /></label></div>
      <label className="field"><span>Source link</span><input type="url" value={form.source_url} onChange={(event) => updateForm("source_url", event.target.value)} placeholder="https://..." /></label>
      <label className="field"><span>Summary / abstract</span><textarea rows="3" value={form.summary} onChange={(event) => updateForm("summary", event.target.value)} placeholder="A short description to help readers decide whether to open it." /></label>
      <div className="protocol-section-editor"><div className="protocol-section-title"><h3>Article sections</h3><button className="reply-button" type="button" onClick={() => updateForm("sections", [...form.sections, { heading: "", body: "" }])}>+ add header</button></div>
        {form.sections.map((section, index) => <div className="protocol-section-field" key={index}><div className="protocol-section-title"><span>Section {index + 1}</span>{form.sections.length > 1 && <button className="reply-button" type="button" onClick={() => updateForm("sections", form.sections.filter((_, sectionIndex) => sectionIndex !== index))}>remove</button>}</div><label className="field"><span>Header</span><input value={section.heading} onChange={(event) => updateForm("sections", form.sections.map((item, sectionIndex) => sectionIndex === index ? { ...item, heading: event.target.value } : item))} placeholder="e.g. Light requirements" /></label><label className="field"><span>Section text</span><textarea rows="5" value={section.body} onChange={(event) => updateForm("sections", form.sections.map((item, sectionIndex) => sectionIndex === index ? { ...item, body: event.target.value } : item))} placeholder="Write the section content here..." /></label></div>)}
      </div><div className="protocol-form-actions"><button className="submit-button" disabled={busy}>{busy ? "saving..." : editingId ? "save changes" : "publish article"}</button><button className="reply-button" type="button" onClick={() => { setShowForm(false); setEditingId(null); }}>cancel</button></div>
    </form>}
    {loading ? <div className="empty-state">loading articles...</div> : visibleArticles.length === 0 ? <div className="empty-state">{query ? "No articles match that search." : "No articles have been added yet."}{!account && !query && <p>Sign in to add the first article to the library.</p>}</div> : <div className="protocol-list">{visibleArticles.map((article) => <article className="protocol-article" key={article.id}>
      <div className="protocol-article-meta"><span>{article.author || "Author not listed"}</span><span>{article.published_on ? new Date(`${article.published_on}T12:00:00`).toLocaleDateString() : "Date not listed"}</span></div>
      <h2>{article.title}</h2>{article.summary && <p className="protocol-summary">{article.summary}</p>}
      {article.source_url && <p className="protocol-source"><a href={article.source_url} target="_blank" rel="noreferrer">view source ↗</a></p>}
      <div className="protocol-rating"><span>Your rating</span><div className="protocol-stars" role="group" aria-label={`Rate ${article.title}`}>{[1,2,3,4,5].map((star) => <button key={star} type="button" className={star <= (ratings[article.id] || 0) ? "star active" : "star"} aria-label={`${star} star${star === 1 ? "" : "s"}`} title={`${star} star${star === 1 ? "" : "s"}`} onClick={() => rateArticle(article.id, star)} disabled={!account}>{star <= (ratings[article.id] || 0) ? "★" : "☆"}</button>)}</div>{!account && <span className="protocol-sign-in-note"><Link to="/login">sign in</Link> to rate</span>}</div>
      <button className="protocol-read-button" onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}>{expandedId === article.id ? "hide article −" : "read article +"}</button>
      {expandedId === article.id && <div className="protocol-article-body">{(article.sections || []).map((section, index) => <section key={`${article.id}-${index}`}><h3>{section.heading}</h3><p>{section.body}</p></section>)}</div>}
      {account?.id === article.created_by && <div className="protocol-owner-actions"><button className="reply-button" onClick={() => openEditForm(article)}>edit article</button><button className="reply-button" onClick={() => deleteArticle(article)}>delete article</button></div>}
    </article>)}</div>}
  </section>;
}

function App() {
  const [account, setAccount] = useState(null); const [loading, setLoading] = useState(true); const location = useLocation();
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) console.error(error.message);
      if (active) { try { setAccount(await getAccount(data.session?.user || null)); } catch (e) { console.error(e.message); setAccount(null); } finally { setLoading(false); } }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(async () => { if (!active) return; try { setAccount(await getAccount(session?.user || null)); } catch { setAccount(null); } setLoading(false); });
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  if (loading) return <div className="loading">plantist</div>;
  return <Layout account={account} setAccount={setAccount}><Routes>
    <Route path="/" element={<Home />} /><Route path="/home" element={<Home />} /><Route path="/about" element={<About />} /><Route path="/login" element={<Login setAccount={setAccount} />} /><Route path="/account" element={<Account account={account} />} /><Route path="/edit" element={<EditAccount account={account} setAccount={setAccount} />} /><Route path="/plants" element={<Plants account={account} />} /><Route path="/panel" element={<PlantPanel account={account} />} /><Route path="/protocol" element={<Protocol account={account} />} /><Route path="*" element={<Home />} />
  </Routes></Layout>;
}
export default App;
