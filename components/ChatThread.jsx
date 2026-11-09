"use client";
import { orionFetch } from "@/lib/orion-fetch";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ChatThread({ auditId }) {
  const supabase = createClient();
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedAttachments, setUploadedAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const audioRef = useRef(null);
  const lastSoundAtRef = useRef(0);
  const [threads, setThreads] = useState([]);
  const router = useRouter();

  async function loadMessages() {
    try {
      const res = await orionFetch(`/api/chats?audit_id=${auditId}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadMessages();
    const iv = setInterval(loadMessages, 5000);
    return () => clearInterval(iv);
  }, [auditId]);

  // load auditee threads for the current auditor (sidebar list)
  useEffect(() => {
    async function loadThreads() {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (!user) return;

        const { data: auditorAudits, error: auditsErr } = await supabase
          .from("audits")
          .select("id,title,auditee_id,auditee")
          .eq("auditor_id", user.id)
          .order("date", { ascending: false });

        if (auditsErr) throw auditsErr;

        const detailed = await Promise.all(
          (auditorAudits || []).map(async (a) => {
            const { data: lastMsg } = await supabase
              .from("messages")
              .select("id,message,created_at,is_read")
              .eq("audit_id", a.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            const { data: unread } = await supabase
              .from("messages")
              .select("id", { count: "exact" })
              .eq("audit_id", a.id)
              .eq("is_read", false)
              .eq("receiver_id", user.id);

            let audProfile = null;
            if (a.auditee_id) {
              const { data: p } = await supabase
                .from("profiles")
                .select("full_name,email,country")
                .eq("id", a.auditee_id)
                .single();
              audProfile = p;
            }

            return {
              auditId: a.id,
              title: a.title,
              auditee: a.auditee || audProfile?.full_name || null,
              auditeeEmail: audProfile?.email || null,
              auditeeCountry: audProfile?.country || null,
              lastMessage: lastMsg ? lastMsg.message : null,
              lastAt: lastMsg ? lastMsg.created_at : null,
              unreadCount: unread ? unread.length : 0,
            };
          })
        );

        setThreads(detailed);
      } catch (e) {
        console.warn('Failed to load threads for sidebar', e);
      }
    }
    loadThreads();
  }, [supabase]);

  useEffect(() => {
    // get current user to align message bubbles
    async function whoami() {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) setCurrentUser(data.user);
      } catch (err) {
        console.warn("failed to get user", err);
      }
    }
    whoami();
  }, [supabase]);

  // create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      const audio = typeof Audio !== "undefined" ? new Audio('/sounds/notify.mp3') : null;
      if (audio) {
        audio.preload = 'auto';
        audioRef.current = audio;
      }
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    // Detect new incoming messages and play sound
    const prev = messagesRef.current || [];
    // Find if there are messages in `messages` that are not in `prev` and belong to others
    if (messages && messages.length > 0) {
      const prevIds = new Set(prev.map((m) => m.id));
      const newMsgs = messages.filter((m) => !prevIds.has(m.id));
      const now = Date.now();
      const canPlay = now - lastSoundAtRef.current > 800; // 800ms cooldown

      if (newMsgs.length > 0 && canPlay) {
        // check if any new message is from another user
        const hasIncoming = newMsgs.some((m) => !(currentUser && m.sender_id === currentUser.id));
        if (hasIncoming && audioRef.current) {
          audioRef.current.currentTime = 0;
          const p = audioRef.current.play();
          if (p && p.catch) p.catch((err) => {
            // Autoplay blocked — show a toast once
            console.debug('Notification sound play blocked:', err);
          });
          lastSoundAtRef.current = Date.now();
        }
      }
    }
    messagesRef.current = messages;
  }, [messages]);

  async function handleSend() {
    if (
      !text.trim() &&
      selectedFiles.length === 0 &&
      uploadedAttachments.length === 0
    )
      return;
    setLoading(true);
    try {
      let attachments = null;
      // Prefer already uploaded attachments (user clicked Upload). If none, upload selected files now.
      if (uploadedAttachments.length > 0) {
        attachments = uploadedAttachments;
      } else if (selectedFiles.length > 0) {
        const uploadPayload = {
          audit_id: auditId,
          files: await Promise.all(
            selectedFiles.map(async (f) => {
              const arr = await f.arrayBuffer();
              // browser-safe base64 conversion
              const base64 = arrayBufferToBase64(arr);
              return { name: f.name, base64, mimeType: f.type };
            })
          ),
        };

        const upRes = await orionFetch(`/api/chats/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(uploadPayload),
        });
        const upData = await upRes.json();
        if (upData.uploaded) attachments = upData.uploaded;
      }

      const res = await orionFetch(`/api/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit_id: auditId, message: text, attachments }),
      });
      const data = await res.json();
      if (data.message) {
        setText("");
        setSelectedFiles([]);
        setUploadedAttachments([]);
        await loadMessages();
      } else {
        toast.error("Failed to send message");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
      // reset textarea height
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  }

  function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return (
    <div className="chat-layout w-full min-w-0">
      <aside className="chat-sidebar">
        <div className="search">
          <input className="form-input" placeholder="Search contacts" />
        </div>

        <div className="chat-contacts">
          {threads.length === 0 ? (
            <div className="p-4 text-slate-500">No contacts found.</div>
          ) : (
            threads.map((t) => (
              <div
                key={t.auditId}
                className="chat-contact cursor-pointer hover:bg-[color:var(--hover-bg)]"
                onClick={() => router.push(`/dashboard/audits/${t.auditId}/chat`)}
              >
                <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                  {t.auditee ? t.auditee[0]?.toUpperCase() : "U"}
                </div>
                <div>
                  <div className="font-medium">{t.auditee || "Unknown"}</div>
                  <div className="text-xs text-slate-500 truncate">{t.lastMessage || "No messages yet"}</div>
                </div>

                {t.unreadCount > 0 && (
                  <div className="ml-auto text-sm bg-red-500 text-white px-2 py-1 rounded">{t.unreadCount}</div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="chat-main">
        <div className="chat-header">
          <div className="font-medium">Audit Chat</div>
        </div>

        <div className="chat-messages">
          {messages.map((m) => {
            const isOwn = currentUser && m.sender_id === currentUser.id;
            return (
              <div
                key={m.id}
                className={`${
                  isOwn ? "justify-end flex" : "justify-start flex"
                }`}
              >
                {!isOwn && (
                  <div className="mr-2 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs text-slate-700 dark:text-slate-100">
                      {m.sender_name ? m.sender_name[0]?.toUpperCase() : "A"}
                    </div>
                  </div>
                )}

                <div className={`message ${isOwn ? "outgoing" : "incoming"}`}>
                  {m.message && (
                    <div className="text-sm whitespace-pre-wrap">
                      {m.message}
                    </div>
                  )}

                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.attachments.map((a, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2 rounded-md bg-[color:rgba(255,255,255,0.6)] dark:bg-slate-800/50"
                        >
                          {a.mimeType?.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={a.url}
                              alt={a.name}
                              className="w-20 h-20 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 flex items-center justify-center bg-slate-200 dark:bg-slate-600 rounded text-xs">
                              {a.name.split(".").pop() || "FILE"}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {a.name}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {a.mimeType}
                            </div>
                          </div>

                          <a
                            href={a.url}
                            download={a.name}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-blue-600 dark:text-cyan-300 underline"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="meta">
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>

                {isOwn && <div className="ml-2 w-8" />}
              </div>
            );
          })}

          <div ref={endRef} />
        </div>

        <div className="chat-composer">
          {/* Hidden file input */}
          <input
            id="chat-file-input"
            type="file"
            multiple
            className="hidden"
            onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
          />

          <div className="flex items-center gap-2 w-full">
            <label htmlFor="chat-file-input" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-200" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15.172 7l-6.364 6.364a2 2 0 01-2.828 0L3.05 9.636a4 4 0 115.657-5.657l1.414 1.414" />
                <path d="M13.172 5.828l1.414-1.414A2 2 0 0117 5.172V15a2 2 0 01-2 2H5.172a2 2 0 01-1.414-.586l1.414-1.414" />
              </svg>
            </label>

            <input
              className="input flex-1"
              placeholder="Type a message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <button className="send-btn" onClick={handleSend} disabled={loading || uploading}>
              Send
            </button>
          </div>

          {/* Selected files preview and upload action */}
          {selectedFiles.length > 0 && (
            <div className="mt-2 w-full overflow-x-auto flex gap-2 items-center">
              {selectedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded">
                  {f.type?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-slate-200 dark:bg-slate-600 rounded text-xs">
                      {f.name.split(".").pop() || "FILE"}
                    </div>
                  )}

                  <div className="flex flex-col">
                    <div className="text-sm font-medium truncate max-w-[10rem]">{f.name}</div>
                    <div className="text-xs text-slate-400">{f.type || "file"}</div>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() => setSelectedFiles((s) => s.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <div className="ml-2">
                <button
                  className="btn-primary"
                  onClick={async () => {
                    // Upload selected files to server and set uploadedAttachments
                    if (selectedFiles.length === 0) return;
                    setUploading(true);
                    try {
                      const uploadPayload = {
                        audit_id: auditId,
                        files: await Promise.all(
                          selectedFiles.map(async (f) => {
                            const arr = await f.arrayBuffer();
                            const base64 = arrayBufferToBase64(arr);
                            return { name: f.name, base64, mimeType: f.type };
                          })
                        ),
                      };

                      const upRes = await orionFetch(`/api/chats/upload`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(uploadPayload),
                      });
                      const upData = await upRes.json();
                      if (upData.uploaded) {
                        setUploadedAttachments((s) => s.concat(upData.uploaded));
                        setSelectedFiles([]);
                        toast("Uploaded attachments ready to send");
                      } else {
                        toast.error("Upload failed");
                      }
                    } catch (err) {
                      console.error(err);
                      toast.error("Upload failed");
                    } finally {
                      setUploading(false);
                    }
                  }}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          )}

          {/* Uploaded attachments list (already uploaded) */}
          {uploadedAttachments.length > 0 && (
            <div className="mt-2 space-y-2 w-full">
              {uploadedAttachments.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-[color:var(--card-bg)] border">
                  {a.mimeType?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.name} className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-slate-200 dark:bg-slate-600 rounded text-xs">
                      {a.name.split(".").pop() || "FILE"}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-slate-500 truncate">{a.mimeType}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a href={a.url} download={a.name} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-cyan-300 underline">Download</a>
                    <button
                      className="btn-secondary"
                      onClick={() => setUploadedAttachments((s) => s.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
