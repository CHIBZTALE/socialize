import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, Pressable, FlatList, StyleSheet, Image,
  Alert, StatusBar, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
type Reaction = 'LIKE'|'LOVE'|'HAHA'|'WOW'|'SAD'|'ANGRY';
type User = { id:string; name:string; username:string; bio?:string; email?:string };
type FriendRequest = { id:string; sender:User };
type Comment = { id:string; text:string; author:{name:string;username:string} };
type Post = { id:string; text:string; createdAt:string; author:{name:string;username:string}; _count?:{comments:number;reactions:number} };
type Tab = 'home'|'friends'|'create'|'chats'|'alerts'|'profile';
const reactions:{type:Reaction;emoji:string;label:string}[] = [
  {type:'LIKE',emoji:'👍',label:'Like'},{type:'LOVE',emoji:'❤️',label:'Love'},
  {type:'HAHA',emoji:'😂',label:'Haha'},{type:'WOW',emoji:'😮',label:'Wow'},
  {type:'SAD',emoji:'😢',label:'Sad'},{type:'ANGRY',emoji:'😡',label:'Angry'}
];
const initials = (name?:string) => (name || 'S').trim().slice(0,1).toUpperCase();
const timeAgo = (value:string) => {
  const mins = Math.max(1, Math.floor((Date.now()-new Date(value).getTime())/60000));
  if (mins < 60) return mins + 'm';
  if (mins < 1440) return Math.floor(mins/60) + 'h';
  return Math.floor(mins/1440) + 'd';
};

function Avatar({name,size=44,ring=false}:{name?:string;size?:number;ring?:boolean}) {
  const photo = 'https://i.pravatar.cc/160?u='+encodeURIComponent(name||'socialize');
  return <View style={[s.avatarOuter,{width:size+6,height:size+6,borderRadius:(size+6)/2},ring&&s.storyRing]}>
    <Image source={{uri:photo}} style={{width:size,height:size,borderRadius:size/2,backgroundColor:'#292447'}} />
  </View>;
}
function Pill({children,active=false,onPress}:{children:React.ReactNode;active?:boolean;onPress?:()=>void}) {
  return <Pressable onPress={onPress} style={[s.pill,active&&s.pillActive]}><Text style={[s.pillText,active&&s.pillTextActive]}>{children}</Text></Pressable>;
}

export default function App() {
  const [posts,setPosts] = useState<Post[]>([]);
  const [token,setToken] = useState('');
  const [user,setUser] = useState<User|null>(null);
  const [mode,setMode] = useState<'register'|'login'>('register');
  const [form,setForm] = useState({name:'',username:'',email:'',password:''});
  const [postText,setPostText] = useState('');
  const [busy,setBusy] = useState(false);
  const [tab,setTab] = useState<Tab>('home');
  const [comments,setComments] = useState<Record<string,Comment[]>>({});
  const [drafts,setDrafts] = useState<Record<string,string>>({});
  const [expanded,setExpanded] = useState<Record<string,boolean>>({});
  const [mine,setMine] = useState<Record<string,Reaction|null>>({});
  const [query,setQuery] = useState('');
  const [results,setResults] = useState<User[]>([]);
  const [friends,setFriends] = useState<User[]>([]);
  const [requests,setRequests] = useState<FriendRequest[]>([]);
  const [profile,setProfile] = useState({name:'',username:'',bio:''});

  const headers = (t=token) => ({'Content-Type':'application/json',Authorization:'Bearer '+t});
  async function loadMine(t:string,items:Post[]) {
    const pairs = await Promise.all(items.map(async p => {
      try { const r=await fetch(API+'/posts/'+p.id+'/reaction',{headers:{Authorization:'Bearer '+t}}); if(!r.ok)return [p.id,null] as const; const d=await r.json(); return [p.id,d?.type||null] as const; }
      catch { return [p.id,null] as const; }
    }));
    setMine(Object.fromEntries(pairs));
  }
  async function refresh(t=token) {
    try { const r=await fetch(API+'/posts'); if(r.ok){const data=await r.json();setPosts(data);if(t)await loadMine(t,data);} }
    catch {}
  }
  async function loadPrivate(t:string) {
    try {
      const [fr,rr,me]=await Promise.all([
        fetch(API+'/friends',{headers:headers(t)}),
        fetch(API+'/friends/requests',{headers:headers(t)}),
        fetch(API+'/users/me',{headers:headers(t)})
      ]);
      if(fr.ok)setFriends(await fr.json());
      if(rr.ok)setRequests(await rr.json());
      if(me.ok){const u=await me.json();setUser(u);setProfile({name:u.name,username:u.username,bio:u.bio||''});}
    } catch { Alert.alert('Socialize','Could not load your account details.'); }
  }
  useEffect(()=>{refresh();},[]);

  async function auth() {
    if(!form.email.trim()||!form.password){Alert.alert('Almost there','Enter your email and password.');return;}
    if(mode==='register'&&(!form.name.trim()||!form.username.trim())){Alert.alert('Almost there','Enter your name and choose a username.');return;}
    setBusy(true);
    try {
      const r=await fetch(API+'/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const d=await r.json();
      if(!r.ok)throw Error(Array.isArray(d.message)?d.message.join(', '):d.message||'Authentication failed');
      setToken(d.accessToken);setUser(d.user);await loadPrivate(d.accessToken);await refresh(d.accessToken);
    } catch(e:any){Alert.alert('Socialize',e.message);} finally{setBusy(false);}
  }
  async function publish() {
    if(!postText.trim())return;
    setBusy(true);
    try {
      const r=await fetch(API+'/posts',{method:'POST',headers:headers(),body:JSON.stringify({text:postText})});
      const d=await r.json();if(!r.ok)throw Error(d.message||'Post failed');
      setPosts([{...d,_count:{comments:0,reactions:0}},...posts]);setPostText('');setTab('home');
    } catch(e:any){Alert.alert('Socialize',e.message);} finally{setBusy(false);}
  }
  async function react(post:Post,type:Reaction) {
    const current=mine[post.id];
    try {
      const r=await fetch(API+'/posts/'+post.id+'/reaction',{method:current===type?'DELETE':'PUT',headers:headers(),...(current===type?{}:{body:JSON.stringify({type})})});
      const d=await r.json();if(!r.ok)throw Error(d.message||'Reaction failed');
      setMine({...mine,[post.id]:current===type?null:type});
      setPosts(posts.map(p=>p.id===post.id?{...p,_count:{comments:p._count?.comments||0,reactions:Math.max(0,(p._count?.reactions||0)+(current===type?-1:current?0:1))}}:p));
    } catch(e:any){Alert.alert('Socialize',e.message);}
  }
  async function toggleComments(post:Post) {
    const show=!expanded[post.id];setExpanded({...expanded,[post.id]:show});
    if(show&&!comments[post.id]){try{const r=await fetch(API+'/posts/'+post.id+'/comments');if(r.ok)setComments({...comments,[post.id]:await r.json()});}catch{Alert.alert('Socialize','Could not load comments.');}}
  }
  async function addComment(post:Post) {
    const value=(drafts[post.id]||'').trim();if(!value)return;
    try {
      const r=await fetch(API+'/posts/'+post.id+'/comments',{method:'POST',headers:headers(),body:JSON.stringify({text:value})});
      const d=await r.json();if(!r.ok)throw Error(d.message||'Comment failed');
      setComments({...comments,[post.id]:[...(comments[post.id]||[]),d]});setDrafts({...drafts,[post.id]:''});
      setPosts(posts.map(p=>p.id===post.id?{...p,_count:{comments:(p._count?.comments||0)+1,reactions:p._count?.reactions||0}}:p));
    } catch(e:any){Alert.alert('Socialize',e.message);}
  }
  async function searchUsers() {
    if(query.trim().length<2){Alert.alert('Search','Enter at least 2 characters.');return;}
    try{const r=await fetch(API+'/users/search?q='+encodeURIComponent(query),{headers:headers()});const d=await r.json();if(!r.ok)throw Error(d.message||'Search failed');setResults(d);}
    catch(e:any){Alert.alert('Socialize',e.message);}
  }
  async function sendRequest(id:string) {
    try{const r=await fetch(API+'/friends/requests/'+id,{method:'POST',headers:headers()});const d=await r.json();if(!r.ok)throw Error(d.message||'Could not send request');setResults(results.filter(x=>x.id!==id));Alert.alert('Socialize','Friend request sent.');}
    catch(e:any){Alert.alert('Socialize',e.message);}
  }
  async function respondRequest(id:string,action:'accept'|'decline') {
    try{const r=await fetch(API+'/friends/requests/'+id+'/'+action,{method:'POST',headers:headers()});const d=await r.json();if(!r.ok)throw Error(d.message||'Could not update request');await loadPrivate(token);}
    catch(e:any){Alert.alert('Socialize',e.message);}
  }
  async function removeFriend(id:string) {
    try{const r=await fetch(API+'/friends/'+id,{method:'DELETE',headers:headers()});const d=await r.json();if(!r.ok)throw Error(d.message||'Could not remove friend');await loadPrivate(token);}
    catch(e:any){Alert.alert('Socialize',e.message);}
  }
  async function saveProfile() {
    setBusy(true);
    try{const r=await fetch(API+'/users/me',{method:'PATCH',headers:headers(),body:JSON.stringify(profile)});const d=await r.json();if(!r.ok)throw Error(d.message||'Could not update profile');setUser(d);Alert.alert('Socialize','Profile updated.');}
    catch(e:any){Alert.alert('Socialize',e.message);}finally{setBusy(false);}
  }
  function signOut(){setUser(null);setToken('');setMine({});setFriends([]);setRequests([]);setResults([]);setTab('home');}

  const person = (u:User,action:React.ReactNode) => <View style={s.person} key={u.id}>
    <Avatar name={u.name}/><View style={{flex:1}}><Text style={s.personName}>{u.name}</Text><Text style={s.handle}>@{u.username}</Text></View>{action}
  </View>;
  const header = (subtitle?:string) => <View style={s.topHeader}>
    <View style={s.brandRow}><View style={s.brandSymbol}><Text style={s.brandSymbolText}>s</Text></View><View><Text style={s.brand}>socialize<Text style={s.brandDot}>.</Text></Text>{subtitle&&<Text style={s.headerSub}>{subtitle}</Text>}</View></View>
    <View style={s.headerTools}><Pressable style={s.headerTool} onPress={()=>setTab('friends')}><Text style={s.headerToolGlyph}>⌕</Text></Pressable><Pressable style={s.headerTool} onPress={()=>setTab('chats')}><Text style={s.headerToolGlyph}>▢</Text></Pressable><Pressable style={s.headerTool} onPress={()=>setTab('alerts')}><Text style={s.headerToolGlyph}>♧</Text></Pressable></View>
  </View>;
  const navItems:{id:Tab;label:string;glyph:string}[]=[
    {id:'home',label:'Home',glyph:'⌂'},{id:'friends',label:'Friends',glyph:'♧'},
    {id:'create',label:'Create',glyph:'＋'},{id:'chats',label:'Chats',glyph:'▤'},
    {id:'alerts',label:'Alerts',glyph:'♧'}
  ];

  if(!user) return <SafeAreaView style={s.screen}>
    <StatusBar barStyle="light-content" backgroundColor="#090A12"/>
    <KeyboardAvoidingView style={{flex:1,justifyContent:'center'}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={s.authHero}><View style={s.logoMark}><Text style={s.logoMarkText}>S</Text></View>
        <Text style={s.authBrand}>socialize<Text style={s.brandDot}>.</Text></Text>
        <Text style={s.authTag}>Your people. Your moments. Your space.</Text>
      </View>
      <View style={s.authCard}>
        <Text style={s.eyebrow}>{mode==='register'?'JOIN THE COMMUNITY':'WELCOME BACK'}</Text>
        <Text style={s.authTitle}>{mode==='register'?'Create your account':'Good to see you'}</Text>
        <Text style={s.authCopy}>{mode==='register'?'A place to share what matters and find your people.':'Sign in and pick up where you left off.'}</Text>
        <ScrollView keyboardShouldPersistTaps="handled">
          {mode==='register'&&<><Text style={s.inputLabel}>FULL NAME</Text><TextInput style={s.input} placeholder="Your name" placeholderTextColor="#77798A" value={form.name} onChangeText={name=>setForm({...form,name})}/><Text style={s.inputLabel}>USERNAME</Text><TextInput style={s.input} placeholder="Choose any username" placeholderTextColor="#77798A" value={form.username} onChangeText={username=>setForm({...form,username})} autoCapitalize="none"/></>}
          <Text style={s.inputLabel}>EMAIL ADDRESS</Text><TextInput style={s.input} placeholder="you@example.com" placeholderTextColor="#77798A" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={email=>setForm({...form,email})}/>
          <Text style={s.inputLabel}>PASSWORD</Text><TextInput style={s.input} placeholder="At least 10 characters" placeholderTextColor="#77798A" secureTextEntry value={form.password} onChangeText={password=>setForm({...form,password})}/>
          <Pressable style={[s.primaryBtn,busy&&{opacity:.65}]} onPress={auth} disabled={busy}><Text style={s.primaryBtnText}>{busy?'PLEASE WAIT…':mode==='register'?'Create account':'Sign in'}  ↗</Text></Pressable>
        </ScrollView>
        <Pressable onPress={()=>setMode(mode==='register'?'login':'register')}><Text style={s.switchText}>{mode==='register'?'Already a member? ':'New to Socialize? '}<Text style={s.switchAccent}>{mode==='register'?'Sign in':'Create an account'}</Text></Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;

  return <SafeAreaView style={s.screen}>
    <StatusBar barStyle="light-content" backgroundColor="#090A12"/>
    {header(tab==='home'?'A little closer, every day.':tab==='friends'?'Find your people.':tab==='create'?'Share a moment.':tab==='chats'?'Conversations':'Your updates')}
    {tab==='home'&&<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.feedContent}>
      <View style={s.welcomeRow}><View><Text style={s.hello}>YOUR COMMUNITY</Text><Text style={s.pageTitle}>Home</Text></View><Pressable onPress={()=>setTab('profile')}><Avatar name={user.name} size={38}/></Pressable></View>
      <View style={s.storiesCard}><View style={s.sectionHead}><Text style={s.sectionTitle}>Stories</Text><Text style={s.sectionHint}>See all  ›</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:14,paddingVertical:4}}>
          <Pressable style={s.storyItem} onPress={()=>setTab('create')}><View style={s.createStoryAvatar}><Avatar name={user.name} size={58}/><Text style={s.storyAddBadge}>＋</Text></View><Text style={s.storyLabel}>Create story</Text></Pressable>
          {friends.slice(0,12).map(f=><View style={s.storyItem} key={f.id}><Avatar name={f.name} size={54} ring/><Text style={s.storyLabel} numberOfLines={1}>{f.name.split(' ')[0]}</Text></View>)}
          {friends.length===0&&<Text style={s.emptyStories}>Add friends to see their moments here.</Text>}
        </ScrollView>
      </View>
      <View style={s.composer}><Avatar name={user.name} size={40}/><Pressable style={s.composerPrompt} onPress={()=>setTab('create')}><Text style={s.composerText}>What's on your mind?</Text></Pressable><Pressable onPress={()=>setTab('create')}><Text style={s.composerPhoto}>▧</Text></Pressable><Pressable onPress={()=>setTab('create')}><Text style={s.composerVideo}>▶</Text></Pressable><Pressable onPress={()=>setTab('create')}><Text style={s.composerEmoji}>☻</Text></Pressable></View>
      <View style={s.feedSectionHead}><Text style={s.sectionTitle}>Latest posts</Text><Pressable onPress={()=>refresh()}><Text style={s.refreshText}>Refresh ↻</Text></Pressable></View>
      {posts.length===0?<View style={s.emptyCard}><Text style={s.emptyIcon}>✦</Text><Text style={s.emptyTitle}>It's quiet in here.</Text><Text style={s.emptyCopy}>Be the first to share a thought with your community.</Text><Pressable style={s.primaryBtn} onPress={()=>setTab('create')}><Text style={s.primaryBtnText}>Create a post  ↗</Text></Pressable></View>:posts.map(item=><View style={s.postCard} key={item.id}>
        <View style={s.postTop}><Avatar name={item.author.name} size={42}/><View style={{flex:1}}><Text style={s.personName}>{item.author.name}</Text><Text style={s.handle}>@{item.author.username}  ·  {item.createdAt?timeAgo(item.createdAt):'now'}</Text></View><Text style={s.more}>•••</Text></View>
        <Text style={s.postBody}>{item.text}</Text>
        <View style={s.postStats}><Text style={s.statText}>{item._count?.reactions||0} reactions</Text><Pressable onPress={()=>toggleComments(item)}><Text style={s.statText}>{item._count?.comments||0} comments</Text></Pressable></View>
        <View style={s.postActions}>{reactions.slice(0,3).map(r=><Pressable key={r.type} onPress={()=>react(item,r.type)} style={s.postAction}><Text style={{fontSize:16}}>{r.emoji}</Text><Text style={[s.actionLabel,mine[item.id]===r.type&&s.actionActive]}>{r.label}</Text></Pressable>)}<Pressable style={s.postAction} onPress={()=>toggleComments(item)}><Text style={s.actionGlyph}>▢</Text><Text style={s.actionLabel}>Comment</Text></Pressable></View>
        {expanded[item.id]&&<View style={s.commentsArea}>{(comments[item.id]||[]).map(c=><View key={c.id} style={s.commentBubble}><Text style={s.commentName}>{c.author.name} · @{c.author.username}</Text><Text style={s.commentText}>{c.text}</Text></View>)}<View style={s.commentComposer}><TextInput style={[s.input,{flex:1,marginTop:0}]} placeholder="Write a comment…" placeholderTextColor="#77798A" value={drafts[item.id]||''} onChangeText={value=>setDrafts({...drafts,[item.id]:value})}/><Pressable style={s.sendBtn} onPress={()=>addComment(item)}><Text style={s.sendText}>Send</Text></Pressable></View></View>}
      </View>)}
    </ScrollView>}
    {tab==='friends'&&<ScrollView contentContainerStyle={s.pageContent} keyboardShouldPersistTaps="handled">
      <Text style={s.pageTitle}>Find your <Text style={s.titleAccent}>people.</Text></Text><Text style={s.pageSub}>Good connections make good days.</Text>
      <View style={s.panel}><Text style={s.sectionTitle}>Discover people</Text><TextInput style={s.input} placeholder="Search names or usernames" placeholderTextColor="#77798A" value={query} onChangeText={setQuery}/><Pressable style={s.primaryBtn} onPress={searchUsers}><Text style={s.primaryBtnText}>Search people  ↗</Text></Pressable>{results.map(u=>person(u,<Pressable style={s.smallBtn} onPress={()=>sendRequest(u.id)}><Text style={s.smallBtnText}>＋ Add</Text></Pressable>))}</View>
      <View style={s.panel}><Text style={s.sectionTitle}>Friend requests <Text style={s.countPill}>{requests.length}</Text></Text>{requests.length===0?<Text style={s.muted}>No pending requests right now.</Text>:requests.map(r=>person(r.sender,<View style={{flexDirection:'row',gap:6}}><Pressable style={s.smallBtn} onPress={()=>respondRequest(r.id,'accept')}><Text style={s.smallBtnText}>Accept</Text></Pressable><Pressable style={s.ghostBtn} onPress={()=>respondRequest(r.id,'decline')}><Text style={s.ghostBtnText}>Decline</Text></Pressable></View>))}</View>
      <View style={s.panel}><Text style={s.sectionTitle}>Your friends <Text style={s.countPill}>{friends.length}</Text></Text>{friends.length===0?<Text style={s.muted}>Your connections will appear here.</Text>:friends.map(f=>person(f,<Pressable style={s.ghostBtn} onPress={()=>removeFriend(f.id)}><Text style={s.ghostBtnText}>Remove</Text></Pressable>))}</View>
    </ScrollView>}
    {tab==='create'&&<ScrollView contentContainerStyle={s.pageContent}><Text style={s.pageTitle}>Share a <Text style={s.titleAccent}>moment.</Text></Text><Text style={s.pageSub}>Your voice belongs here.</Text>
      <View style={s.panel}><View style={s.postTop}><Avatar name={user.name}/><View><Text style={s.personName}>{user.name}</Text><Text style={s.handle}>Posting to your community</Text></View></View><TextInput style={s.postInput} multiline textAlignVertical="top" placeholder="What would you like to share today?" placeholderTextColor="#77798A" value={postText} onChangeText={setPostText}/><View style={s.createFooter}><Text style={s.muted}>{postText.length} characters</Text><Pressable style={[s.primaryBtn,{minWidth:140,marginTop:0}]} onPress={publish} disabled={busy||!postText.trim()}><Text style={s.primaryBtnText}>{busy?'Sharing…':'Share post  ↗'}</Text></Pressable></View></View>
      <View style={s.tipCard}><Text style={s.tipIcon}>✧</Text><Text style={s.tipTitle}>A little reminder</Text><Text style={s.tipCopy}>Keep it kind. Keep it real. Make this a space people love coming back to.</Text></View>
    </ScrollView>}
    {(tab==='chats'||tab==='alerts')&&<View style={s.comingWrap}><View style={s.comingOrb}><Text style={s.comingGlyph}>{tab==='chats'?'✉':'♧'}</Text></View><Text style={s.comingTitle}>{tab==='chats'?'Conversations are coming.':'Your updates are coming.'}</Text><Text style={s.comingCopy}>{tab==='chats'?'Private messaging is planned for the next development stage.':'Notifications for reactions, comments and friend activity are planned next.'}</Text><View style={s.comingTag}><Text style={s.comingTagText}>ON THE ROADMAP</Text></View></View>}
    {tab==='profile'&&<ScrollView contentContainerStyle={s.pageContent}><View style={s.profileCover}><Image source={{uri:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200'}} style={s.coverImage}/><Pressable style={s.coverCamera}><Text style={s.coverCameraText}>▣</Text></Pressable></View><View style={s.profileHero}><View style={s.profileAvatarWrap}><Avatar name={user.name} size={94}/></View><Text style={s.profileName}>{user.name} <Text style={s.verifiedMark}>✓</Text></Text><Text style={s.handle}>@{user.username}</Text><Text style={s.profileBio}>{profile.bio||'Content Creator | Dream Big | Stay Positive | Let’s Build a Better Tomorrow Together 💯'}</Text><View style={s.profileStats}><View><Text style={s.profileStatNumber}>{friends.length}</Text><Text style={s.profileStatLabel}>Friends</Text></View><View><Text style={s.profileStatNumber}>0</Text><Text style={s.profileStatLabel}>Followers</Text></View><View><Text style={s.profileStatNumber}>0</Text><Text style={s.profileStatLabel}>Following</Text></View></View><View style={s.profileActions}><Pressable style={s.profileMainAction} onPress={()=>setTab('friends')}><Text style={s.profileActionText}>＋ Add Friend</Text></Pressable><Pressable style={s.profileMessageAction} onPress={()=>setTab('chats')}><Text style={s.profileActionText}>● Message</Text></Pressable></View><View style={s.profileTabs}><Text style={s.profileTabActive}>Posts</Text><Text style={s.profileTab}>About</Text><Text style={s.profileTab}>Friends</Text><Text style={s.profileTab}>Photos</Text></View></View><View style={s.panel}><Text style={s.sectionTitle}>Edit profile</Text><Text style={s.inputLabel}>DISPLAY NAME</Text><TextInput style={s.input} value={profile.name} onChangeText={name=>setProfile({...profile,name})}/><Text style={s.inputLabel}>USERNAME</Text><TextInput style={s.input} value={profile.username} onChangeText={username=>setProfile({...profile,username})}/><Text style={s.inputLabel}>BIO</Text><TextInput style={[s.input,{height:100}]} multiline maxLength={160} placeholder="Tell people a little about yourself" placeholderTextColor="#77798A" value={profile.bio} onChangeText={bio=>setProfile({...profile,bio})}/><Text style={s.muted}>{profile.bio.length}/160 characters</Text><Pressable style={s.primaryBtn} onPress={saveProfile} disabled={busy}><Text style={s.primaryBtnText}>{busy?'Saving…':'Save changes  ↗'}</Text></Pressable></View><Pressable style={s.signOut} onPress={signOut}><Text style={s.signOutText}>Sign out</Text></Pressable></ScrollView>}
    <View style={s.bottomNav}>{navItems.map(n=><Pressable key={n.id} onPress={()=>{setTab(n.id);if(n.id==='friends')loadPrivate(token);}} style={s.navButton}><View style={[s.navIconWrap,tab===n.id&&s.navIconActive]}><Text style={[s.navGlyph,tab===n.id&&s.navGlyphActive]}>{n.glyph}</Text></View><Text style={[s.navLabel,tab===n.id&&s.navLabelActive]}>{n.label}</Text></Pressable>)}</View>
  </SafeAreaView>;
}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#090A12',paddingTop:Platform.OS==='android'?8:0},
  topHeader:{height:70,paddingHorizontal:17,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#1C1E2C'},
  brandRow:{flexDirection:'row',alignItems:'center',gap:10},brandSymbol:{width:34,height:34,borderRadius:12,backgroundColor:'#4B16E8',alignItems:'center',justifyContent:'center'},brandSymbolText:{fontSize:27,fontWeight:'900',color:'#fff'},headerTools:{flexDirection:'row',alignItems:'center',gap:10},headerTool:{width:34,height:34,borderRadius:17,backgroundColor:'#191B29',alignItems:'center',justifyContent:'center'},headerToolGlyph:{fontSize:22,color:'#F7F6FF'},
  brand:{fontSize:27,fontWeight:'900',letterSpacing:-1.2,color:'#F7F6FF'},brandDot:{color:'#9C7BFF'},
  headerSub:{fontSize:11,color:'#85879A',marginTop:1,letterSpacing:.3},
  headerAvatar:{padding:2},
  authHero:{alignItems:'center',marginBottom:30},
  logoMark:{width:58,height:58,borderRadius:20,backgroundColor:'#7757E8',alignItems:'center',justifyContent:'center',shadowColor:'#7757E8',shadowOpacity:.4,shadowRadius:18,elevation:8},
  logoMarkText:{fontSize:32,fontWeight:'900',color:'#fff'},
  authBrand:{fontSize:35,fontWeight:'900',letterSpacing:-1.5,color:'#F7F6FF',marginTop:12},
  authTag:{fontSize:13,color:'#85879A',marginTop:4},
  authCard:{marginHorizontal:20,backgroundColor:'#121421',borderColor:'#24263A',borderWidth:1,borderRadius:25,padding:22},
  eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:2,color:'#A78BFA'},
  authTitle:{fontSize:26,fontWeight:'800',color:'#F8F7FF',marginTop:9},
  authCopy:{fontSize:13,color:'#85879A',lineHeight:20,marginTop:5,marginBottom:17},
  inputLabel:{fontSize:10,fontWeight:'800',letterSpacing:1.3,color:'#A6A8B8',marginTop:13,marginBottom:7},
  input:{backgroundColor:'#0C0E19',borderWidth:1,borderColor:'#292C41',borderRadius:13,paddingHorizontal:14,paddingVertical:13,color:'#F7F6FF',fontSize:14,marginTop:7},
  primaryBtn:{backgroundColor:'#7959E8',borderRadius:13,paddingVertical:15,paddingHorizontal:18,alignItems:'center',justifyContent:'center',marginTop:17,shadowColor:'#7959E8',shadowOpacity:.2,shadowRadius:10,elevation:3},
  primaryBtnText:{color:'#fff',fontSize:13,fontWeight:'800',letterSpacing:.3},
  switchText:{textAlign:'center',color:'#85879A',fontSize:12,marginTop:20},
  switchAccent:{color:'#B39BFF',fontWeight:'800'},
  feedContent:{paddingHorizontal:17,paddingBottom:110},
  pageContent:{padding:18,paddingBottom:110},
  welcomeRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:19,paddingBottom:17},
  hello:{fontSize:9,fontWeight:'900',letterSpacing:2,color:'#A78BFA'},
  pageTitle:{fontSize:25,fontWeight:'900',letterSpacing:-.8,color:'#F7F6FF',marginTop:5},
  titleAccent:{color:'#B19AFF'},
  pageSub:{fontSize:13,color:'#85879A',marginTop:6,marginBottom:18},
  onlineDot:{width:9,height:9,borderRadius:5,backgroundColor:'#F08A83',marginRight:4},
  storiesCard:{backgroundColor:'#121421',borderWidth:1,borderColor:'#24263A',borderRadius:20,padding:15,marginBottom:13},
  sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},
  sectionTitle:{fontSize:16,fontWeight:'800',color:'#F5F4FC'},
  sectionHint:{fontSize:10,color:'#85879A'},
  storyItem:{width:62,alignItems:'center'},
  pill:{paddingHorizontal:12,paddingVertical:8,borderRadius:20,backgroundColor:'#1A1C2B',borderWidth:1,borderColor:'#303249'},
  pillActive:{backgroundColor:'#33285B',borderColor:'#7959E8'},
  pillText:{fontSize:11,color:'#A5A6B4',fontWeight:'700'},
  pillTextActive:{color:'#D6C9FF'},
  storyRing:{borderWidth:2,borderColor:'#9C7BFF',padding:2},
  avatarOuter:{alignItems:'center',justifyContent:'center'},
  avatar:{backgroundColor:'#292447',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#55448D'},
  avatarText:{color:'#D9CEFF',fontWeight:'900'},
  storyLabel:{fontSize:10,color:'#B9BBC9',marginTop:6,maxWidth:62},
  createStoryAvatar:{position:'relative'},storyAddBadge:{position:'absolute',right:-2,bottom:-1,width:23,height:23,borderRadius:12,backgroundColor:'#286BFF',color:'#fff',fontSize:19,textAlign:'center',overflow:'hidden'},
  addStory:{width:60,height:60,borderRadius:30,backgroundColor:'#1C2032',borderWidth:1,borderColor:'#49416D',alignItems:'center',justifyContent:'center'},
  addStoryPlus:{fontSize:30,color:'#B69FFF',fontWeight:'300',marginTop:-2},
  emptyStories:{fontSize:11,color:'#77798A',alignSelf:'center',paddingVertical:18},
  composer:{flexDirection:'row',alignItems:'center',backgroundColor:'#121421',borderWidth:1,borderColor:'#24263A',borderRadius:17,padding:12,marginBottom:20,gap:10},
  composerPrompt:{flex:1,backgroundColor:'#0C0E19',borderRadius:12,padding:12},
  composerText:{fontSize:12,color:'#898B9D'},
  composerPlus:{fontSize:25,color:'#B19AFF',paddingHorizontal:5},composerPhoto:{fontSize:22,color:'#FF4C55',paddingHorizontal:4},composerVideo:{fontSize:20,color:'#A13BFF',paddingHorizontal:4},composerEmoji:{fontSize:23,color:'#FFC928',paddingHorizontal:4},
  feedSectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:11},
  refreshText:{fontSize:11,color:'#B19AFF',fontWeight:'700'},
  emptyCard:{backgroundColor:'#121421',borderWidth:1,borderColor:'#24263A',borderRadius:20,padding:24,alignItems:'center',marginTop:4},
  emptyIcon:{fontSize:32,color:'#B19AFF'},emptyTitle:{fontSize:18,fontWeight:'800',color:'#F7F6FF',marginTop:9},emptyCopy:{fontSize:12,color:'#85879A',textAlign:'center',lineHeight:19,marginTop:6},
  postCard:{backgroundColor:'#121421',borderWidth:1,borderColor:'#24263A',borderRadius:19,padding:15,marginBottom:12},
  postTop:{flexDirection:'row',alignItems:'center',gap:10},
  personName:{fontSize:13,fontWeight:'800',color:'#F3F2FA'},
  handle:{fontSize:10,color:'#85879A',marginTop:3},
  more:{color:'#85879A',fontWeight:'900',letterSpacing:2},
  postBody:{fontSize:14,color:'#E8E7F0',lineHeight:22,marginTop:16,marginBottom:15},
  postStats:{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#27293A',paddingBottom:11},
  statText:{fontSize:10,color:'#898B9D'},
  postActions:{flexDirection:'row',justifyContent:'space-around',paddingTop:12},
  postAction:{flexDirection:'row',alignItems:'center',gap:5},
  actionLabel:{fontSize:10,color:'#A5A6B4',fontWeight:'700'},actionActive:{color:'#B59FFF'},actionGlyph:{fontSize:17,color:'#A5A6B4'},
  commentsArea:{borderTopWidth:1,borderTopColor:'#27293A',marginTop:12,paddingTop:10},
  commentBubble:{backgroundColor:'#1A1C2B',padding:11,borderRadius:12,marginBottom:7},
  commentName:{fontSize:10,color:'#B59FFF',fontWeight:'800',marginBottom:4},commentText:{fontSize:12,color:'#E8E7F0'},
  commentComposer:{flexDirection:'row',alignItems:'center',gap:7},
  sendBtn:{backgroundColor:'#7959E8',borderRadius:10,padding:12},sendText:{color:'#fff',fontWeight:'800',fontSize:11},
  panel:{backgroundColor:'#121421',borderWidth:1,borderColor:'#24263A',borderRadius:19,padding:16,marginBottom:14},
  person:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:11,borderBottomWidth:1,borderBottomColor:'#252739'},
  smallBtn:{backgroundColor:'#7959E8',paddingHorizontal:13,paddingVertical:9,borderRadius:10},smallBtnText:{fontSize:10,color:'#fff',fontWeight:'800'},
  ghostBtn:{borderWidth:1,borderColor:'#41445A',paddingHorizontal:12,paddingVertical:8,borderRadius:10},ghostBtnText:{fontSize:10,color:'#B8BAC8',fontWeight:'700'},
  muted:{fontSize:11,color:'#85879A',lineHeight:18,marginTop:8},
  countPill:{fontSize:11,color:'#B59FFF'},
  postInput:{minHeight:190,color:'#F7F6FF',fontSize:16,lineHeight:25,marginTop:22,marginBottom:12},
  createFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:'#292B3E',paddingTop:12},
  tipCard:{backgroundColor:'#1B1830',borderWidth:1,borderColor:'#39305F',borderRadius:17,padding:17},
  tipIcon:{fontSize:22,color:'#B59FFF'},tipTitle:{fontSize:14,fontWeight:'800',color:'#F5F1FF',marginTop:7},tipCopy:{fontSize:12,color:'#AAA3C5',lineHeight:19,marginTop:5},
  comingWrap:{flex:1,alignItems:'center',justifyContent:'center',padding:35},
  comingOrb:{width:88,height:88,borderRadius:30,backgroundColor:'#211B3A',borderWidth:1,borderColor:'#51427D',alignItems:'center',justifyContent:'center'},
  comingGlyph:{fontSize:36,color:'#B69FFF'},comingTitle:{fontSize:21,fontWeight:'900',color:'#F7F6FF',textAlign:'center',marginTop:22},
  comingCopy:{fontSize:13,color:'#85879A',textAlign:'center',lineHeight:21,marginTop:9},
  comingTag:{marginTop:18,borderWidth:1,borderColor:'#51427D',borderRadius:30,paddingHorizontal:13,paddingVertical:7},comingTagText:{fontSize:9,fontWeight:'900',letterSpacing:1.4,color:'#B69FFF'},
  profileCover:{height:180,borderRadius:16,overflow:'hidden',marginBottom:0,position:'relative'},coverImage:{width:'100%',height:'100%'},coverCamera:{position:'absolute',right:12,bottom:12,width:38,height:38,borderRadius:19,backgroundColor:'#10121E',alignItems:'center',justifyContent:'center'},coverCameraText:{fontSize:18,color:'#fff'},profileHero:{alignItems:'center',paddingVertical:12,marginTop:-44},profileAvatarWrap:{borderWidth:4,borderColor:'#090A12',borderRadius:56},profileName:{fontSize:22,fontWeight:'900',color:'#F7F6FF',marginTop:8},verifiedMark:{color:'#168BFF',fontSize:17},profileBio:{fontSize:12,color:'#D0CFDA',marginTop:10,textAlign:'center',lineHeight:18},profileStats:{width:'100%',flexDirection:'row',justifyContent:'space-around',paddingVertical:18,borderBottomWidth:1,borderBottomColor:'#27293A',marginTop:6},profileStatNumber:{fontSize:19,fontWeight:'900',color:'#F7F6FF',textAlign:'center'},profileStatLabel:{fontSize:11,color:'#A5A6B4',marginTop:3,textAlign:'center'},profileActions:{width:'100%',flexDirection:'row',gap:10,marginTop:14},profileMainAction:{flex:1,backgroundColor:'#5B16F5',borderRadius:25,paddingVertical:13,alignItems:'center'},profileMessageAction:{flex:1,backgroundColor:'#242637',borderRadius:25,paddingVertical:13,alignItems:'center'},profileActionText:{color:'#fff',fontSize:12,fontWeight:'800'},profileTabs:{width:'100%',flexDirection:'row',justifyContent:'space-around',paddingTop:19,paddingBottom:12,marginTop:12,borderBottomWidth:1,borderBottomColor:'#292B3E'},profileTabActive:{color:'#C18BFF',fontSize:13,fontWeight:'800'},profileTab:{color:'#E4E2EC',fontSize:13},
  signOut:{alignItems:'center',padding:16},signOutText:{fontSize:12,color:'#F08A83',fontWeight:'800'},
  bottomNav:{position:'absolute',left:0,right:0,bottom:0,height:76,backgroundColor:'#10121E',borderTopWidth:1,borderTopColor:'#252739',flexDirection:'row',justifyContent:'space-around',alignItems:'center',paddingBottom:Platform.OS==='android'?7:0},
  navButton:{flex:1,alignItems:'center',justifyContent:'center',gap:4},
  navIconWrap:{width:39,height:29,borderRadius:11,alignItems:'center',justifyContent:'center'},
  navIconActive:{backgroundColor:'#33285B'},navGlyph:{fontSize:21,color:'#737588'},navGlyphActive:{color:'#C1AEFF'},navLabel:{fontSize:9,color:'#77798A',fontWeight:'700'},navLabelActive:{color:'#C1AEFF'}
});
