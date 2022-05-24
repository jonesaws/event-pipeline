#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { RbFeedmgrStack } from '../lib/rb_feedmgr-stack';

const app = new cdk.App();
new RbFeedmgrStack(app, 'RbFeedmgrStack');
