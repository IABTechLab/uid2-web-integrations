import { createApp } from '../shared/createApp';
import { Layout } from '../shared/layout';
import { MenuBar } from './menubar';

createApp(
  <Layout
    siteName='www'
    extraHeader={
      <MenuBar>
        <div>
          <a href='/'>Main</a>
        </div>
      </MenuBar>
    }
  >
    <div className='article'>Some general site info.</div>
  </Layout>
);
