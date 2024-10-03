import './www.scss';
import { Layout } from '../shared/layout';
import { createApp } from '../shared/createApp';
import { initUid2Sdk } from '../shared/uid2Helper';
import { MenuBar } from './menubar';

initUid2Sdk();

const articles = [
  {
    title: 'Interesting article',
    text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
  },
  {
    title: 'Another interesting article',
    text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
  },
];

createApp(
  <Layout
    siteName='www'
    extraHeader={
      <MenuBar>
        <div>
          <a href='/info.html'>Info</a>
        </div>
      </MenuBar>
    }
  >
    {articles.map((a) => (
      <div className='article' key={a.title}>
        {a.text}
      </div>
    ))}
  </Layout>
);
