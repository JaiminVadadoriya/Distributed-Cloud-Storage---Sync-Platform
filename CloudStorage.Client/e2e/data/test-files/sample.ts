import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-preview-test',
  template: '<h1>Preview Test</h1>'
})
export class PreviewTestComponent implements OnInit {
  constructor() {}
  ngOnInit(): void {
    console.log('Preview test component initialized');
  }
}
